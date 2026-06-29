import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssuesFromStorage,
  deleteQueueImageGroupFromStorage,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  isDeletableQueueIssue,
  isFixableQueueIssue,
  loadQueueStorageImages,
  log,
  QueueIssue,
  requireGlobalAdmin,
  simulateGetQueueTagsFromStorage,
  summarizeQueueIssues,
} from './common'
import { HttpStatusCode } from './common/constants'

const getStorageKeyFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname.slice(1)
  } catch {
    return ''
  }
}

const inspectQueueFolder = async (
  gameSlug: string,
  awsRegion: string,
  currentTag?: Tag,
) => {
  const storage = await loadQueueStorageImages(gameSlug, awsRegion)
  const queue = simulateGetQueueTagsFromStorage(storage.images, gameSlug)
  const issues: QueueIssue[] = collectQueueIssuesFromStorage(
    storage.images,
    storage.keys,
    currentTag,
    queue,
    storage.unparsedKeys,
  )

  if (storage.keys.length === 0) {
    issues.push({
      category: 'missing-variants',
      tagnumber: currentTag?.tagnumber ?? 0,
      issue: `no files found in ${storage.bucket}/queue/ — check bucket, credentials, or region (${awsRegion})`,
    })
  } else if (storage.images.length === 0) {
    log(
      '[queue-fix] Queue folder files present but none matched expected naming pattern',
      { sampleKeys: storage.keys.slice(0, 5), unparsedKeys: storage.unparsedKeys.slice(0, 5) },
      'warn',
    )
  }

  return { storage, queue, issues }
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

    const deleteUrl = typeof payloadOpts.deleteUrl === 'string' ? payloadOpts.deleteUrl : undefined
    const deleteKey =
      typeof payloadOpts.deleteKey === 'string'
        ? payloadOpts.deleteKey
        : deleteUrl
          ? getStorageKeyFromUrl(deleteUrl)
          : undefined
    const deleteWrongRound = coerceBooleanQueryParam(payloadOpts.deleteWrongRound) === true
    const shouldFix =
      !deleteKey &&
      !deleteWrongRound &&
      (req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true)
    const imageSource = getImageSource(game)

    log('[queue-fix] Running queue scan', {
      shouldFix,
      deleteKey,
      deleteWrongRound,
      game: game.name,
      gameSlug,
      awsRegion: game.awsRegion,
    })

    const currentTagResponse = await biketag.getTag(undefined, { source: imageSource })
    const currentTag = currentTagResponse.success ? currentTagResponse.data : undefined

    if (!currentTagResponse.success) {
      log(
        '[queue-fix] Could not load current tag from main folder',
        { error: currentTagResponse.error },
        'warn',
      )
    }

    let deletedKeys: string[] = []

    if (deleteWrongRound) {
      const preDelete = await inspectQueueFolder(gameSlug, game.awsRegion, currentTag)
      const wrongRoundKeys = [
        ...new Set(
          preDelete.issues.filter(isDeletableQueueIssue).map((issue) => issue.key as string),
        ),
      ]

      for (const key of wrongRoundKeys) {
        const result = await deleteQueueImageGroupFromStorage(
          gameSlug,
          game.awsRegion,
          key,
          preDelete.storage.keys,
        )
        deletedKeys.push(...result.deleted)
      }

      deletedKeys = [...new Set(deletedKeys)]
      log('[queue-fix] Deleted wrong-round queue files', {
        primaryKeys: wrongRoundKeys,
        deletedKeys,
      })
    } else if (deleteKey?.startsWith('queue/')) {
      const preDelete = await loadQueueStorageImages(gameSlug, game.awsRegion)
      const result = await deleteQueueImageGroupFromStorage(
        gameSlug,
        game.awsRegion,
        deleteKey,
        preDelete.keys,
      )
      deletedKeys = result.deleted
      log('[queue-fix] Deleted queue image group', { deleteKey, deletedKeys })
    } else if (deleteKey || deleteUrl) {
      return new Response(JSON.stringify({ error: 'invalid queue file key' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

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

    const { storage, queue, issues } = await inspectQueueFolder(
      gameSlug,
      game.awsRegion,
      currentTag,
    )

    log('[queue-fix] Inspected queue folder', {
      storageBucket: storage.bucket,
      storageFileCount: storage.keys.length,
      primaryImages: storage.images.length,
      unparsedKeyCount: storage.unparsedKeys.length,
      simulatedQueueCount: queue.length,
      currentRound: currentTag?.tagnumber,
    })

    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const deletableIssueCount = issues.filter(isDeletableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      deleted: deletedKeys.length > 0,
      deletedKeys,
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
      deletableIssueCount,
      summary,
      issues,
      queue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      deleted: deletedKeys.length,
      currentRound: currentTag?.tagnumber,
      issueCount: issues.length,
      fixableIssueCount,
      deletableIssueCount,
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
