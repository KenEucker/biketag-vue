import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssuesFromStorage,
  getBikeTagClientOpts,
  getGameStorageSlug,
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

    if (!game.awsRegion?.length) {
      return new Response(JSON.stringify({ error: 'game has no aws region configured' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const gameSlug = getGameStorageSlug(game, biketagOpts.game)
    const biketag = new BikeTagClient(getBikeTagClientOpts(req, true, false, game))

    biketag.config(
      {
        biketag: { host: process.env.HOST },
        aws: { region: game.awsRegion },
      },
      false,
      true,
    )

    const payloadOpts = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
      cached: false,
    })

    const shouldFix = req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true
    const imageSource = getImageSource(game)

    log('[queue-fix] Running queue scan', {
      shouldFix,
      game: game.name,
      gameSlug,
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
          { error: fixResponse.error, status: fixResponse.status },
          'error',
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: fixResponse.error ?? 'failed to fix queue folder',
          }),
          {
            headers,
            status: fixResponse.status ?? HttpStatusCode.BadRequest,
          },
        )
      }
    }

    // Current round lives in the main folder index.
    const currentTagResponse = await biketag.getTag(undefined, { source: 'aws' })
    const currentTag = currentTagResponse.success ? currentTagResponse.data : undefined

    if (!currentTagResponse.success) {
      log(
        '[queue-fix] Could not load current tag from main folder',
        { error: currentTagResponse.error },
        'warn',
      )
    }

    // Inspect the queue folder directly — do not rely on getQueue grouping alone.
    const storage = await loadQueueStorageImages(gameSlug, game.awsRegion)
    const queue = simulateGetQueueTagsFromStorage(storage.images, gameSlug)
    const issues: QueueIssue[] = collectQueueIssuesFromStorage(
      storage.images,
      storage.keys,
      currentTag,
      queue,
      storage.unparsedKeys,
    )

    log('[queue-fix] Inspected queue folder', {
      storageBucket: storage.bucket,
      storageFileCount: storage.keys.length,
      primaryImages: storage.images.length,
      unparsedKeyCount: storage.unparsedKeys.length,
      simulatedQueueCount: queue.length,
      currentRound: currentTag?.tagnumber,
    })

    if (storage.keys.length === 0) {
      issues.push({
        category: 'missing-variants',
        tagnumber: currentTag?.tagnumber ?? 0,
        issue: `no files found in ${storage.bucket}/queue/ — check bucket, credentials, or region (${game.awsRegion})`,
      })
    } else if (storage.images.length === 0) {
      log(
        '[queue-fix] Queue folder files present but none matched expected naming pattern',
        { sampleKeys: storage.keys.slice(0, 5), unparsedKeys: storage.unparsedKeys.slice(0, 5) },
        'warn',
      )
    }

    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      queueReindexed: shouldFix,
      queueResized: shouldFix,
      currentRound: currentTag?.tagnumber,
      expectedQueueRound: (currentTag?.tagnumber ?? 0) + 1,
      storageBucket: storage.bucket,
      storageFileCount: storage.keys.length,
      unparsedKeyCount: storage.unparsedKeys.length,
      queueCount: queue.length,
      issueCount: issues.length,
      fixableIssueCount,
      summary,
      issues,
      queue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      currentRound: currentTag?.tagnumber,
      issueCount: issues.length,
      fixableIssueCount,
      queueCount: queue.length,
      storageFileCount: storage.keys.length,
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
