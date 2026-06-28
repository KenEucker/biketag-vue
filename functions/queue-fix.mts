import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  getQueueImageUrlIssues,
  log,
  requireGlobalAdmin,
} from './common'
import { HttpStatusCode } from './common/constants'

const configureAwsClient = (biketag: BikeTagClient, game: Game, imageSource: string) => {
  if (imageSource === 'aws') {
    biketag.config(
      {
        biketag: { host: process.env.HOST },
        aws: { region: game.awsRegion },
      },
      false,
      true,
    )
  }
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[queue-fix] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)

    if (!requireGlobalAdmin(profile)) {
      log('[queue-fix] Unauthorized attempt', { email: profile?.email ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const biketagOpts = getBikeTagClientOpts(req, true, true)
    const adminBiketag = new BikeTagClient(biketagOpts)

    const game = (await adminBiketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    if (!game) {
      return new Response(JSON.stringify({ error: 'game not found' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const imageSource = getImageSource(game)
    configureAwsClient(adminBiketag, game, imageSource)

    const payloadOpts = await getPayloadOpts(req, {
      game: biketagOpts.game,
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
      cached: false,
    })

    const shouldFix = req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true
    const queueHost = getQueueApiHost(biketagOpts.game)

    log('[queue-fix] Running queue scan', { shouldFix, game: game.name })

    const queueResponse = await adminBiketag.getQueue(
      {
        game: biketagOpts.game,
        host: queueHost,
        region: game.awsRegion,
        cached: false,
        reindex: true,
        resize: shouldFix,
      },
      { source: imageSource },
    )

    if (!queueResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: queueResponse.error ?? 'failed to load queue',
        }),
        {
          headers,
          status: queueResponse.status ?? HttpStatusCode.BadRequest,
        },
      )
    }

    const queue = queueResponse.data ?? []
    const issues = getQueueImageUrlIssues(queue)
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      queueReindexed: true,
      queueResized: shouldFix,
      issueCount: issues.length,
      issues,
      queue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      issueCount: issues.length,
      queueCount: queue.length,
    })

    return new Response(JSON.stringify(responsePayload), {
      headers,
      status: HttpStatusCode.Ok,
    })
  } catch (err: any) {
    log('[queue-fix] Unexpected error', err, 'error')
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
