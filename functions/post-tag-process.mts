import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  log,
  NewBikeTagPostPipelinePayload,
  runPostTagProcessStep,
} from './common'
import { HttpStatusCode } from './common/constants'

type PostTagProcessPayload = NewBikeTagPostPipelinePayload & {
  step?: 'resize-found' | 'resize-mystery' | 'finalize'
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()
  log('[post-tag] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const payload = (await getPayloadOpts(req)) as PostTagProcessPayload
    const { step, gameSlug, winningBikeTagPost, previousBikeTag } = payload

    if (!step || !gameSlug || !winningBikeTagPost || !previousBikeTag) {
      return new Response(JSON.stringify({ error: 'missing step or post payload' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const bootstrap = new BikeTagClient(getBikeTagClientOpts(req, true))
    const game = (await bootstrap.game(gameSlug, { source: 'sanity', concise: true })) as Game

    if (!game) {
      return new Response(JSON.stringify({ error: `game not found: ${gameSlug}` }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    log('[post-tag] Running step', { step, game: game.name, tagnumber: winningBikeTagPost.tagnumber })

    const result = await runPostTagProcessStep(step, { gameSlug, winningBikeTagPost, previousBikeTag }, game)

    log('[post-tag] Step completed', { step, errors: result.errors })

    return new Response(JSON.stringify(result), {
      headers,
      status: result.errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  } catch (err: any) {
    log('[post-tag] Unhandled error', err, 'error')
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message ?? 'Unknown error',
      }),
      {
        status: HttpStatusCode.InternalServerError,
        headers,
      },
    )
  }
}
