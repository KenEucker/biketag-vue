import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getQueueApiHost,
  HttpStatusCode,
  log,
  runQueueResizeFull,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[queue-resize-background] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: HttpStatusCode.MethodNotAllowed,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    const payload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
    })

    const imageSource = (payload.imageSource as string) ?? getImageSource(game)
    delete payload.imageSource

    if (getImageSource(game) === 'aws' && game.awsRegion?.length) {
      biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
    }

    const queueResponse = await runQueueResizeFull(
      biketag,
      {
        ...payload,
        cached: false,
        reindex: payload.reindex ?? true,
        resize: true,
      },
      imageSource,
    )

    log(
      '[queue-resize-background] Finished',
      {
        success: queueResponse.success,
        error: queueResponse.error,
        count: Array.isArray(queueResponse.data) ? queueResponse.data.length : 0,
      },
      queueResponse.success ? 'info' : 'warn',
    )
  } catch (error) {
    log('[queue-resize-background] Unexpected error', error, 'error')
  }

  return new Response('', { status: HttpStatusCode.Ok, headers })
}
