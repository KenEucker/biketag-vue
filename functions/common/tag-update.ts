import type { Tag } from 'biketag'
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { foundEditFields, mysteryEditFields } from '../../src/common/tag-edits'
import { decodeQueueMetadataValue } from './storage-metadata'

/** Prepare an explicitly requested metadata edit, leaving general updates unrestricted. */
export const prepareTagMetadataUpdate = (
  input: Partial<Tag>,
  existing: Tag,
  game: string,
  source: string,
): Partial<Tag> & Pick<Tag, 'game' | 'tagnumber'> => {
  if (input.game && input.game !== game) throw new Error('Tag game does not match request game')
  for (const field of ['foundImage', 'mysteryImage'] as const) {
    if (input[field]) throw new Error('Image uploads are not supported when editing tag metadata')
  }
  for (const field of ['foundImageUrl', 'mysteryImageUrl'] as const) {
    if (input[field] !== undefined && input[field] !== existing[field]) {
      throw new Error(`${field} does not match tag #${existing.tagnumber}`)
    }
  }
  const changes = Object.fromEntries(
    [...mysteryEditFields, ...foundEditFields]
      .filter((field) => input[field] !== undefined)
      .map((field) => [field, input[field]]),
  )
  // AWS metadata edits merge the stored record without passing image URLs to an uploader.
  return source === 'aws'
    ? { game, tagnumber: existing.tagnumber, ...changes }
    : { ...existing, ...changes, game, tagnumber: existing.tagnumber }
}

/** Update only the image metadata involved in an admin edit, then patch its index record.
 * The SDK metadata branch touches both images, including stale unrelated references.
 */
export const updateMainTagMetadata = async (
  client: S3Client,
  patch: ReturnType<typeof prepareTagMetadataUpdate>,
) => {
  try {
    const Bucket = `${patch.game}-biketag`
    const response = await client.send(new GetObjectCommand({ Bucket, Key: 'main/index.json' }))
    const index: Tag[] = JSON.parse(await response.Body!.transformToString('utf-8'))
    if (!Array.isArray(index)) throw new Error('Invalid main index format')
    const position = index.findIndex((tag) => tag.tagnumber === patch.tagnumber)
    if (position < 0) throw new Error(`Tag #${patch.tagnumber} not found in main`)
    const existing = index[position]
    const changes = prepareTagMetadataUpdate(patch, existing, patch.game, 'aws')
    const updated = { ...existing, ...changes }
    const metadataFields = {
      mystery: {
        t: 'tagnumber',
        p: 'playerId',
        mp: 'mysteryPlayer',
        mt: 'mysteryTime',
        h: 'hint',
        d: 'discussionUrl',
        m: 'mentionUrl',
      },
      found: {
        t: 'tagnumber',
        p: 'playerId',
        fp: 'foundPlayer',
        ft: 'foundTime',
        fl: 'foundLocation',
        g: 'gps',
        c: 'confirmedBoundary',
      },
    } as const
    const imageUpdates = []
    for (const [type, fields] of [
      ['mystery', mysteryEditFields],
      ['found', foundEditFields],
    ] as const) {
      if (!fields.some((field) => changes[field] !== undefined)) continue
      const url = existing[`${type}ImageUrl`]
      if (!url) throw new Error(`Tag #${patch.tagnumber} has no ${type} image`)
      const Key = new URL(url).pathname.slice(1)
      const base = `main/${patch.game}-tag-${patch.tagnumber}--${type}`
      if (!['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif'].some((ext) => Key === `${base}.${ext}`)) {
        throw new Error(`${type} image does not belong to tag #${patch.tagnumber} in main`)
      }
      // Preflight every affected image before changing any object metadata.
      const head = await client.send(new HeadObjectCommand({ Bucket, Key }))
      let storedMetadata: Record<string, unknown> = {}
      if (head.Metadata?.data) {
        storedMetadata = JSON.parse(decodeQueueMetadataValue(head.Metadata.data))
      }
      const data = {
        ...storedMetadata,
        ...Object.fromEntries(
          Object.entries(metadataFields[type]).map(([key, field]) => [key, updated[field]]),
        ),
      }
      imageUpdates.push({ Key, head, data })
    }
    if (!imageUpdates.length) return { success: true, status: 200, source: 'aws', data: existing }
    for (const { Key, head, data } of imageUpdates) {
      await client.send(
        new CopyObjectCommand({
          Bucket,
          Key,
          CopySource: `${Bucket}/${Key}`,
          ACL: 'public-read',
          MetadataDirective: 'REPLACE',
          Metadata: {
            ...head.Metadata,
            data: Buffer.from(JSON.stringify(data), 'utf-8').toString('base64'),
          },
          ContentType: head.ContentType,
          CacheControl: head.CacheControl,
          ContentDisposition: head.ContentDisposition,
          ContentEncoding: head.ContentEncoding,
          ContentLanguage: head.ContentLanguage,
          Expires: head.Expires,
        }),
      )
    }
    // Re-read after copying metadata so rounds published during that work are retained.
    const latestResponse = await client.send(
      new GetObjectCommand({ Bucket, Key: 'main/index.json' }),
    )
    const latestIndex: Tag[] = JSON.parse(await latestResponse.Body!.transformToString('utf-8'))
    if (!Array.isArray(latestIndex)) throw new Error('Invalid main index format')
    const latestPosition = latestIndex.findIndex((tag) => tag.tagnumber === patch.tagnumber)
    if (latestPosition < 0) throw new Error(`Tag #${patch.tagnumber} not found in main`)
    const savedTag = { ...latestIndex[latestPosition], ...changes }
    latestIndex[latestPosition] = savedTag
    await client.send(
      new PutObjectCommand({
        Bucket,
        Key: 'main/index.json',
        Body: JSON.stringify(latestIndex),
        ContentType: 'application/json',
        ACL: 'public-read',
        CacheControl: 'no-cache, no-store, must-revalidate',
      }),
    )
    return { success: true, status: 200, source: 'aws', data: savedTag }
  } catch (error) {
    return {
      success: false,
      status: 400,
      source: 'aws',
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update tag metadata',
    }
  }
}
