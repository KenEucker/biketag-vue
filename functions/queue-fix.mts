import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssues,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  isFixableQueueIssue,
  log,
  requireGlobalAdmin,
  summarizeQueueIssues,
} from './common'
import { HttpStatusCode } from './common/constants'

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

    const biketagOpts = getBikeTagClientOpts(req, true)
    const bootstrap = new BikeTagClient(biketagOpts)

    const game = (await bootstrap.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    if (!game) {
      return new Response(JSON.stringify({ error: 'game not found' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    // Re-init with game so S3 gets the DO Spaces region/endpoint on first use (same as queue.mts).
    const biketag = new BikeTagClient(getBikeTagClientOpts(req, true, false, game))
    const imageSource = getImageSource(game)

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

    const payloadOpts = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
      cached: false,
    })

    const shouldFix = req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true

    log('[queue-fix] Running queue scan', {
      shouldFix,
      game: game.name,
      imageSource,
      awsRegion: game.awsRegion,
    })

    const queueResponse = await biketag.getQueue(
      {
        game: biketagOpts.game,
        host: getQueueApiHost(biketagOpts.game),
        region: game.awsRegion,
        cached: false,
        reindex: true,
        resize: shouldFix,
      },
      { source: imageSource },
    )

    if (!queueResponse.success) {
      log(
        '[queue-fix] getQueue failed',
        { error: queueResponse.error, status: queueResponse.status, imageSource },
        'error',
      )
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
    const currentTagResponse = await biketag.getTag({ slug: 'current' }, { source: 'sanity' })
    const currentTag = currentTagResponse.success ? currentTagResponse.data : undefined
    const issues = await collectQueueIssues(queue, currentTag, { checkVariants: true })
    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      queueReindexed: true,
      queueResized: shouldFix,
      currentRound: currentTag?.tagnumber,
      expectedQueueRound: (currentTag?.tagnumber ?? 0) + 1,
      queueCount: queue.length,
      issueCount: issues.length,
      fixableIssueCount,
      summary,
      issues,
      queue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      issueCount: issues.length,
      fixableIssueCount,
      queueCount: queue.length,
      summary,
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
