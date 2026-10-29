import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { BikeTagClient, type Game, type Tag } from 'biketag'
import {
  acceptCorsHeaders,
  createQueueStorageClient,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getImageSource,
  getProfileAuthorization,
  requireGlobalAdmin,
} from './common'
import { decodeQueueMetadataValue } from './common/storage-metadata'
import { tagMetadataFields, type TagMetadataType } from '../src/common/tag-metadata'
import { encodeTagMetadata } from './common/tag-metadata'

export default async (req: Request) => {
  const headers = {
    ...acceptCorsHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  try {
    const profile = await getProfileAuthorization(req)
    if (!requireGlobalAdmin(profile)) return respond({ error: 'Admin access required' }, 403)

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return respond({ error: 'Invalid JSON request' }, 400)
    }
    if (!['retrieve', 'load', 'generate'].includes(payload?.action)) {
      return respond({ error: 'Select retrieve, load, or generate' }, 400)
    }
    const { action, type, tagnumber } = payload
    if (!Number.isSafeInteger(tagnumber) || tagnumber < 1) {
      return respond({ error: 'Enter a positive whole tag number' }, 400)
    }
    if (type !== 'mystery' && type !== 'found') {
      return respond({ error: 'Select mystery or found metadata' }, 400)
    }
    const metadataType: TagMetadataType = type

    // Generation is independent of storage, so missing tags and images can be recovered.
    if (action === 'generate') {
      const input = payload.tag
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return respond({ error: 'BikeTag fields are required' }, 400)
      }
      const tag: Record<string, unknown> = { tagnumber }
      for (const field of Object.values(tagMetadataFields[metadataType])) {
        if (field === 'tagnumber' || input[field] === undefined) continue
        const value = input[field]
        if (field === 'gps') {
          if (
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value) ||
            typeof value.lat !== 'number' ||
            !Number.isFinite(value.lat) ||
            Math.abs(value.lat) > 90 ||
            typeof value.long !== 'number' ||
            !Number.isFinite(value.long) ||
            Math.abs(value.long) > 180 ||
            (value.alt !== undefined &&
              (typeof value.alt !== 'number' || !Number.isFinite(value.alt)))
          )
            return respond({ error: 'GPS requires valid numeric lat, long, and optional alt' }, 400)
          tag.gps = {
            lat: value.lat,
            long: value.long,
            ...(value.alt !== undefined ? { alt: value.alt } : {}),
          }
        } else if (field === 'confirmedBoundary') {
          if (typeof value !== 'boolean')
            return respond({ error: 'confirmedBoundary must be true or false' }, 400)
          tag[field] = value
        } else if (field === 'mysteryTime' || field === 'foundTime') {
          if (!Number.isSafeInteger(value) || value < 0)
            return respond(
              { error: `${field} must be Unix seconds (a non-negative whole number)` },
              400,
            )
          tag[field] = value
        } else {
          if (typeof value !== 'string') return respond({ error: `${field} must be text` }, 400)
          tag[field] = value
        }
      }
      const encoded = encodeTagMetadata(metadataType, tag)
      return respond({
        entries: [{ encoded, decoded: JSON.parse(decodeQueueMetadataValue(encoded)) }],
      })
    }

    const opts = getBikeTagClientOpts(req, true)
    if (typeof opts.game !== 'string' || !opts.game.length) {
      return respond({ error: 'Open tag metadata from a game site' }, 400)
    }
    const biketag = new BikeTagClient(opts)
    const game = (await biketag.game(opts.game, { source: 'sanity', concise: true })) as Game
    if (!game?.name) return respond({ error: 'Game not found' }, 404)
    const gameSlug = getGameStorageSlug(game, opts.game)

    if (action === 'load' && getImageSource(game) !== 'aws') {
      biketag.config(getBikeTagClientOpts(req, true, false, game), false, true)
      const result = await biketag.getTags(
        { game: gameSlug, tagnumbers: [tagnumber], folder: 'main' },
        {
          source: getImageSource(game),
          hash: game.mainhash,
          cached: false,
        },
      )
      if (!result.success) return respond({ error: 'Unable to load BikeTag fields' }, 502)
      const tag = (result.data as Tag[])?.find((tag) => tag.tagnumber === tagnumber)
      if (!tag) return respond({ error: `Tag #${tagnumber} not found` }, 404)
      return respond({ tag })
    }

    if (!game.awsRegion?.length)
      return respond({ error: 'DigitalOcean storage is not configured for this game' }, 400)
    const client = createQueueStorageClient(game.awsRegion)
    const Bucket = `${gameSlug}-biketag`
    if (action === 'load') {
      // The SDK rebuilds and saves a missing index even for getTags. Read it directly here.
      let response
      try {
        response = await client.send(new GetObjectCommand({ Bucket, Key: 'main/index.json' }))
      } catch (error: any) {
        if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
          return respond(
            { error: 'Published tag index is missing. Enter the BikeTag fields manually.' },
            404,
          )
        }
        throw error
      }
      const tags: Tag[] = JSON.parse(await response.Body!.transformToString('utf-8'))
      if (!Array.isArray(tags)) return respond({ error: 'Invalid published tag index' }, 502)
      const tag = tags.find((tag) => tag.tagnumber === tagnumber)
      if (!tag) return respond({ error: `Tag #${tagnumber} not found` }, 404)
      return respond({ tag })
    }
    const Prefix = `main/${gameSlug}-tag-${tagnumber}--${type}`
    const keys: string[] = []
    let ContinuationToken: string | undefined
    do {
      const list = await client.send(
        new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }),
      )
      for (const object of list.Contents ?? []) {
        // Only original images of this exact tag/type; exclude resized siblings.
        if (
          object.Key?.startsWith(`${Prefix}.`) &&
          /^\.(webp|jpe?g|png|gif|avif)$/i.test(object.Key.slice(Prefix.length))
        ) {
          keys.push(object.Key)
        }
      }
      ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined
    } while (ContinuationToken)
    if (!keys.length)
      return respond({ error: `No published ${type} image found for tag #${tagnumber}` }, 404)
    const entries = await Promise.all(
      keys.sort().map(async (Key) => {
        const head = await client.send(new HeadObjectCommand({ Bucket, Key }))
        const encoded = head.Metadata?.data ?? null
        let decoded: unknown = null
        if (encoded) {
          const raw = decodeQueueMetadataValue(encoded)
          try {
            decoded = JSON.parse(raw)
          } catch {
            decoded = raw
          }
        }
        return { key: Key, encoded, decoded }
      }),
    )
    return respond({ entries })
  } catch (error) {
    console.error('[tag-metadata] Request failed', error)
    return respond({ error: 'Unable to process tag metadata. Check the server logs.' }, 500)
  }
}
