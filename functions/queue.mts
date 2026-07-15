import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getQueueApiHost,
  getQueueWithResizeRetry,
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
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
    })
    if (coerceBooleanQueryParam(biketagPayload.resize) !== undefined) {
      biketagPayload.resize = coerceBooleanQueryParam(biketagPayload.resize)
    }
    if (coerceBooleanQueryParam(biketagPayload.reindex) !== undefined) {
      biketagPayload.reindex = coerceBooleanQueryParam(biketagPayload.reindex)
    }
    log('[get-queue] Prepared biketag payload', biketagPayload)

    const imageSource = getImageSource(game)
    log('[get-queue] Using image source', { imageSource })

    if (imageSource === 'aws') {
      const updatedConfig = biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[get-queue] AWS config applied', updatedConfig)
    }

    const queuePayload = biketagPayload as getQueuePayload
    // Leave headroom under Netlify's 26s queue timeout for game lookup + deferred reindex.
    const queueResizeSyncTimeoutMs = parseInt(
      process.env.QUEUE_RESIZE_SYNC_TIMEOUT_MS ?? '15000',
      10,
    )
    const queueResponse = queuePayload.resize
      ? await getQueueWithResizeRetry(biketag, queuePayload, imageSource, {
          syncTimeoutMs: queueResizeSyncTimeoutMs,
        })
      : await biketag.getQueue(queuePayload, { source: imageSource })
    log('[get-queue] getQueue response', {
      success: queueResponse.success,
      status: queueResponse.status,
      count: Array.isArray(queueResponse.data) ? queueResponse.data.length : 0,
      resizeDeferred: 'resizeDeferred' in queueResponse && queueResponse.resizeDeferred === true,
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
