import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssuesFromStorage,
  completeOrphanedQueueFoundMoveToMain,
  deleteQueueImageGroupFromStorage,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  getQueueImageFromStorage,
  isDeletableQueueIssue,
  isFixableQueueIssue,
  isRepairableQueueIssue,
  loadMainStorageKeys,
  loadQueueStorageImages,
  log,
  MainFolderContext,
  parseTagnumberFromStorageKey,
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

const loadMainFolderContext = async (
  biketag: BikeTagClient,
  gameSlug: string,
  awsRegion: string,
  currentTag: Tag | undefined,
  queueImages: { key: string; type: string; tagnumber: number }[],
  imageSource: string,
): Promise<MainFolderContext> => {
  const mainKeys = await loadMainStorageKeys(gameSlug, awsRegion)
  const mainTagsByRound = new Map<number, Tag>()

  if (!currentTag?.tagnumber) {
    return { gameSlug, mainKeys, mainTagsByRound, currentTag }
  }

  const roundsToCheck = new Set<number>()
  for (const image of queueImages) {
    if (image.type !== 'found') continue
    const round = parseTagnumberFromStorageKey(image.key) ?? image.tagnumber
    if (round === undefined || round >= currentTag.tagnumber) continue
    roundsToCheck.add(round)
    const nextRound = round + 1
    if (nextRound < currentTag.tagnumber) {
      roundsToCheck.add(nextRound)
    }
  }

  await Promise.all(
    [...roundsToCheck].map(async (round) => {
      const response = await biketag.getTag({ tagnumber: round }, { source: imageSource })
      if (response.success && response.data) {
        mainTagsByRound.set(round, response.data as Tag)
      }
    }),
  )

  return { gameSlug, mainKeys, mainTagsByRound, currentTag }
}

const inspectQueueFolder = async (
  gameSlug: string,
  awsRegion: string,
  currentTag: Tag | undefined,
  main?: MainFolderContext,
) => {
  const storage = await loadQueueStorageImages(gameSlug, awsRegion)
  const queue = simulateGetQueueTagsFromStorage(storage.images, gameSlug)
  const allKeys = [...storage.keys, ...(main?.mainKeys ?? [])]
  const issues: QueueIssue[] = collectQueueIssuesFromStorage(
    storage.images,
    allKeys,
    currentTag,
    queue,
    storage.unparsedKeys,
    main,
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
    const adminBiketag = new BikeTagClient(getBikeTagClientOpts(req, true, true, game))

    biketag.config(
      {
        biketag: { host: process.env.HOST },
        aws: { region: game.awsRegion },
      },
      false,
      true,
    )
    adminBiketag.config(
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
    const moveToMainKey =
      typeof payloadOpts.moveToMainKey === 'string'
        ? payloadOpts.moveToMainKey
        : typeof payloadOpts.moveToMainUrl === 'string'
          ? getStorageKeyFromUrl(payloadOpts.moveToMainUrl)
          : undefined
    const deleteWrongRound = coerceBooleanQueryParam(payloadOpts.deleteWrongRound) === true
    const shouldFix =
      !deleteKey &&
      !deleteWrongRound &&
      !moveToMainKey &&
      (req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true)
    const imageSource = getImageSource(game)

    log('[queue-fix] Running queue scan', {
      shouldFix,
      deleteKey,
      deleteWrongRound,
      moveToMainKey,
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
    let movedToMain: { key: string; mainUrl?: string } | undefined

    if (moveToMainKey?.startsWith('queue/')) {
      const preMoveStorage = await loadQueueStorageImages(gameSlug, game.awsRegion)
      const queueImage = getQueueImageFromStorage(preMoveStorage.images, moveToMainKey)

      if (!queueImage || queueImage.type !== 'found') {
        return new Response(JSON.stringify({ error: 'queue found image not found' }), {
          headers,
          status: HttpStatusCode.BadRequest,
        })
      }

      const preMoveMain = await loadMainFolderContext(
        biketag,
        gameSlug,
        game.awsRegion,
        currentTag,
        preMoveStorage.images,
        imageSource,
      )

      const moveResult = await completeOrphanedQueueFoundMoveToMain(
        game,
        gameSlug,
        queueImage,
        adminBiketag,
        imageSource,
        preMoveMain,
      )

      if (!moveResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: moveResult.error ?? 'failed to move queue found image to main',
          }),
          {
            headers,
            status: HttpStatusCode.BadRequest,
          },
        )
      }

      movedToMain = { key: moveToMainKey, mainUrl: moveResult.mainUrl }
      log('[queue-fix] Moved orphaned queue found image to main', movedToMain)
    } else if (moveToMainKey) {
      return new Response(JSON.stringify({ error: 'invalid queue file key for main move' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    if (deleteWrongRound) {
      const preDeleteMain = await loadMainFolderContext(
        biketag,
        gameSlug,
        game.awsRegion,
        currentTag,
        (await loadQueueStorageImages(gameSlug, game.awsRegion)).images,
        imageSource,
      )
      const preDelete = await inspectQueueFolder(
        gameSlug,
        game.awsRegion,
        currentTag,
        preDeleteMain,
      )
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

    const shouldReindex = shouldFix || deletedKeys.length > 0 || !!movedToMain
    let reindexedQueue: Tag[] | undefined

    if (shouldReindex) {
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
          '[queue-fix] getQueue reindex failed',
          { error: queueResponse.error, status: queueResponse.status, shouldFix, deletedKeys },
          'error',
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: queueResponse.error ?? 'failed to reindex queue folder',
          }),
          {
            headers,
            status: queueResponse.status ?? HttpStatusCode.BadRequest,
          },
        )
      }

      reindexedQueue = queueResponse.data
      log('[queue-fix] Queue reindexed', {
        queueCount: reindexedQueue?.length ?? 0,
        resized: shouldFix,
      })
    }

    const preInspectStorage = await loadQueueStorageImages(gameSlug, game.awsRegion)
    const mainContext = await loadMainFolderContext(
      biketag,
      gameSlug,
      game.awsRegion,
      currentTag,
      preInspectStorage.images,
      imageSource,
    )
    const { storage, queue, issues } = await inspectQueueFolder(
      gameSlug,
      game.awsRegion,
      currentTag,
      mainContext,
    )
    const reportedQueue = reindexedQueue ?? queue

    log('[queue-fix] Inspected queue folder', {
      storageBucket: storage.bucket,
      storageFileCount: storage.keys.length,
      primaryImages: storage.images.length,
      unparsedKeyCount: storage.unparsedKeys.length,
      simulatedQueueCount: queue.length,
      reindexedQueueCount: reportedQueue.length,
      currentRound: currentTag?.tagnumber,
    })

    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const deletableIssueCount = issues.filter(isDeletableQueueIssue).length
    const repairableIssueCount = issues.filter(isRepairableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      deleted: deletedKeys.length > 0,
      deletedKeys,
      movedToMain,
      queueReindexed: shouldReindex,
      queueResized: shouldFix,
      currentRound: currentTag?.tagnumber,
      expectedQueueRound: (currentTag?.tagnumber ?? 0) + 1,
      storageBucket: storage.bucket,
      storageFileCount: storage.keys.length,
      unparsedKeyCount: storage.unparsedKeys.length,
      queueCount: reportedQueue.length,
      issueCount: issues.length,
      fixableIssueCount,
      deletableIssueCount,
      repairableIssueCount,
      summary,
      issues,
      queue: reportedQueue,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      deleted: deletedKeys.length,
      movedToMain: !!movedToMain,
      queueReindexed: shouldReindex,
      currentRound: currentTag?.tagnumber,
      issueCount: issues.length,
      fixableIssueCount,
      deletableIssueCount,
      repairableIssueCount,
      queueCount: reportedQueue.length,
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
