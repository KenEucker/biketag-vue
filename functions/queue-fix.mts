import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssuesFromStorage,
  collectQueueIssuesFromTags,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  isFixableQueueIssue,
  loadQueueStorageImages,
  log,
  QueueIssue,
  requireGlobalAdmin,
  simulateGetQueueTagsFromStorage,
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

    if (shouldFix) {
      const fixResponse = await biketag.getQueue(
        {
          game: biketagOpts.game,
          host: getQueueApiHost(biketagOpts.game),
          region: game.awsRegion,
          cached: false,
          reindex: true,
          resize: true,
        },
        { source: imageSource },
      )

      if (!fixResponse.success) {
        log(
          '[queue-fix] getQueue fix failed',
          { error: fixResponse.error, status: fixResponse.status, imageSource },
          'error',
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: fixResponse.error ?? 'failed to fix queue',
          }),
          {
            headers,
            status: fixResponse.status ?? HttpStatusCode.BadRequest,
          },
        )
      }
    }

    const currentTagResponse = await biketag.getTag({ slug: 'current' }, { source: 'sanity' })
    const currentTag = currentTagResponse.success ? currentTagResponse.data : undefined

    let queue: Tag[] = []
    let issues: QueueIssue[] = []
    let storageFileCount = 0
    let inspectedFrom: 'storage' | 'queue' = 'queue'

    if (imageSource === 'aws' && game.awsRegion?.length) {
      inspectedFrom = 'storage'
      const storage = await loadQueueStorageImages(biketagOpts.game, game.awsRegion)
      storageFileCount = storage.keys.length
      queue = simulateGetQueueTagsFromStorage(storage.images, biketagOpts.game)
      issues = collectQueueIssuesFromStorage(
        storage.images,
        storage.keys,
        currentTag,
        queue,
      )

      log('[queue-fix] Inspected queue storage', {
        storageFileCount,
        primaryImages: storage.images.length,
        simulatedQueueCount: queue.length,
      })
    } else {
      const queueResponse = await biketag.getQueue(
        {
          game: biketagOpts.game,
          host: getQueueApiHost(biketagOpts.game),
          region: game.awsRegion,
          cached: false,
          reindex: !shouldFix,
          resize: false,
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

      queue = queueResponse.data ?? []
      issues = await collectQueueIssuesFromTags(queue, currentTag)
    }

    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      queueReindexed: shouldFix,
      queueResized: shouldFix,
      inspectedFrom,
      currentRound: currentTag?.tagnumber,
      expectedQueueRound: (currentTag?.tagnumber ?? 0) + 1,
      storageFileCount,
      queueCount: queue.length,
      issueCount: issues.length,
      fixableIssueCount,
      summary,
      issues,
      queue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      inspectedFrom,
      issueCount: issues.length,
      fixableIssueCount,
      queueCount: queue.length,
      storageFileCount,
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
