import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'
// @ts-ignore
import { getQueuePayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-queue] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-queue] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-queue] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-queue] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-queue] Prepared biketag payload', biketagPayload)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    log('[get-queue] Using image source', { imageSource })

    if (imageSource === 'aws') {
      biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[get-queue] AWS config applied', { host: process.env.HOST, region: game.awsRegion })
    }

    const queueResponse = await biketag.getQueue(biketagPayload as getQueuePayload, {
      source: imageSource,
    })
    log('[get-queue] getQueue response', {
      success: queueResponse.success,
      status: queueResponse.status,
      count: Array.isArray(queueResponse.data) ? queueResponse.data.length : 0,
    })

    const { success, data } = queueResponse

    return new Response(JSON.stringify(success ? data : queueResponse), {
      status: queueResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[get-queue] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
