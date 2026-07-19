/**
 * queue-fix — Admin API for AWS queue/ folder inspection and repairs.
 *
 * Scope: `{game}-biketag` bucket, `queue/` prefix (plus read-only peeks at `main/` for
 * orphan detection and one index patch after Move to main). Global admin only.
 *
 * ─── Request modes (POST body / query via getPayloadOpts) ───
 *
 * | Mode              | Trigger                          | Mutations |
 * |-------------------|----------------------------------|-----------|
 * | Scan              | GET, or POST without action flags| None      |
 * | Fix queue images  | POST, no action flags (shouldFix)| queue/ via biketag getQueue(reindex, resize) |
 * | Delete one file   | deleteKey / deleteUrl            | queue/ delete |
 * | Delete wrong-round| deleteWrongRound: true           | queue/ delete (all wrong-round issues) |
 * | Clear entire queue| clearQueue: true                 | queue/ delete (all objects) + reindex |
 * | Move to main      | moveToMainKey + moveToMainTargetRound | queue/ copy→main/ found slot; main/index.json patch |
 *
 * Every request ends with a fresh scan and JSON report (issues, summary, queue snapshot).
 *
 * ─── Handler order (single request) ───
 *
 * 1. Auth (global admin), load game + AWS region, configure BikeTagClient.
 * 2. Parse action flags from payload (delete, move, fix).
 * 3. Load current live tag from main/ (biketag getTag).
 * 4. If moveToMainKey: validate → completeOrphanedQueueFoundMoveToMain (see methods.ts).
 * 5. If deleteWrongRound or deleteKey: deleteQueueImageGroupFromStorage on queue/ only.
 * 6. If any mutation or shouldFix: biketag getQueue({ reindex: true, resize: shouldFix }).
 *    - Rebuilds queue/index.json from queue/ objects (biketag, not this file).
 *    - resize only when Fix Queue Images (shouldFix); runs game resize API for webp variants.
 * 7. inspectQueueFolder: list queue/, simulate queue tags, collect issues (read-only on main/).
 * 8. Return report JSON.
 *
 * ─── Issue categories (from collectQueueIssuesFromStorage) ───
 *
 * - non-webp: file in queue/ is not .webp (fixable via resize), or unrecognized name (deletable only).
 * - missing-variants: primary .webp exists but _medium/_small siblings missing in queue/.
 * - wrong-round: filename round ≠ expected (found=current or current+1, mystery=current+1). Deletable.
 * - duplicate-uploader: same player has files spanning rounds without a normal found+mystery pair.
 * - orphaned-main-found: past-round found still in queue/, main/ missing that round's --found.
 *   Side-by-side preview uses main/ --mystery file for comparison. Move to main if repairable.
 *
 * ─── Move to main (orphaned found only) ───
 *
 * Does NOT call biketag updateTag (that adapter renames/moves main/ files when image URLs are set).
 * Steps: copy queue/...--found → main/...--found (no overwrite; converts non-webp to webp) →
 * delete queue copies → patch foundImageUrl on that tagnumber in main/index.json only if not already set.
 * Skips _small/_medium copy when those main/ variants already exist (e.g. after partial autopost).
 *
 * moveToMainTargetRound is required (usually metadata round when filename uses live round).
 *
 * ─── Known limitations / tech debt ───
 *
 * - main/index.json read/write duplicated here; belongs in biketag as a safe indexOnly update.
 * - loadQueueStorageImages may HeadObject every queue file; called multiple times per request.
 * - loadMainFolderContext fetches getTag per relevant past round for orphan checks.
 * - Orphan detection reads main/ keys + index via getTag; does not repair main/ index otherwise.
 */
import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  collectQueueIssuesFromStorage,
  completeOrphanedQueueFoundMoveToMain,
  repairMainFoundIndexFromStorage,
  deleteQueueImageGroupFromStorage,
  clearAllQueueStorageObjects,
  evaluateOrphanedQueueFoundForMain,
  evaluateOrphanedQueueFoundForTarget,
  resolveOrphanTargetsForImage,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  getQueueWithResizeRetry,
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
  QueueStorageImage,
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
  queueImages: QueueStorageImage[],
  imageSource: string,
): Promise<MainFolderContext> => {
  // mainKeys: S3 list of main/ (for --found / --mystery presence checks)
  // mainTagsByRound: biketag getTag for previous round + any past rounds referenced by queue found files
  const mainKeys = await loadMainStorageKeys(gameSlug, awsRegion)
  const mainTagsByRound = new Map<number, Tag>()

  if (!currentTag?.tagnumber) {
    return { gameSlug, mainKeys, mainTagsByRound, currentTag }
  }

  const roundsToCheck = new Set<number>()
  if (currentTag.tagnumber > 1) {
    roundsToCheck.add(currentTag.tagnumber - 1)
  }
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
  // 1. List + parse queue/  2. Simulate queue tags  3. collectQueueIssuesFromStorage
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
    const moveToMainTargetRound =
      typeof payloadOpts.moveToMainTargetRound === 'number'
        ? payloadOpts.moveToMainTargetRound
        : undefined
    const repairMainFoundIndexRound =
      typeof payloadOpts.repairMainFoundIndexRound === 'number'
        ? payloadOpts.repairMainFoundIndexRound
        : undefined
    const deleteWrongRound = coerceBooleanQueryParam(payloadOpts.deleteWrongRound) === true
    const clearQueue = coerceBooleanQueryParam(payloadOpts.clearQueue) === true
    const shouldFix =
      !deleteKey &&
      !deleteWrongRound &&
      !clearQueue &&
      !moveToMainKey &&
      repairMainFoundIndexRound === undefined &&
      (req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true)
    const imageSource = getImageSource(game)

    log('[queue-fix] Running queue scan', {
      shouldFix,
      deleteKey,
      deleteWrongRound,
      clearQueue,
      moveToMainKey,
      repairMainFoundIndexRound,
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
    let repairedMainIndex: { round: number; mainUrl?: string } | undefined

    if (repairMainFoundIndexRound !== undefined) {
      const repairResult = await repairMainFoundIndexFromStorage(
        game,
        gameSlug,
        repairMainFoundIndexRound,
        adminBiketag,
        imageSource,
      )

      if (!repairResult.success) {
        log(
          '[queue-fix] Repair main index failed',
          { repairMainFoundIndexRound, error: repairResult.error },
          'error',
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: repairResult.error ?? 'failed to repair main index from storage',
          }),
          {
            headers,
            status: HttpStatusCode.BadRequest,
          },
        )
      }

      repairedMainIndex = {
        round: repairMainFoundIndexRound,
        mainUrl: repairResult.mainUrl,
      }
      log('[queue-fix] Repaired main index from storage metadata', repairedMainIndex)
    } else if (moveToMainKey?.startsWith('queue/')) {
      if (moveToMainTargetRound === undefined) {
        return new Response(
          JSON.stringify({
            error:
              'moveToMainTargetRound is required — the orphan target round must be explicit (usually from metadata, not the queue filename)',
          }),
          {
            headers,
            status: HttpStatusCode.BadRequest,
          },
        )
      }

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

      log('[queue-fix] Attempting move to main', {
        moveToMainKey,
        moveToMainTargetRound,
        queueUrl: queueImage.url,
        extension: queueImage.extension,
      })

      const moveResult = await completeOrphanedQueueFoundMoveToMain(
        game,
        gameSlug,
        queueImage,
        adminBiketag,
        imageSource,
        preMoveMain,
        moveToMainTargetRound,
      )

      if (!moveResult.success) {
        log(
          '[queue-fix] Move to main failed',
          {
            moveToMainKey,
            moveToMainTargetRound,
            error: moveResult.error,
          },
          'error',
        )
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
    } else if (clearQueue) {
      const clearResult = await clearAllQueueStorageObjects(gameSlug, game.awsRegion)
      deletedKeys = clearResult.deleted
      log('[queue-fix] Cleared entire queue folder', { deletedCount: deletedKeys.length })
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

    const shouldReindex = clearQueue || shouldFix || deletedKeys.length > 0 || !!movedToMain
    let reindexedQueue: Tag[] | undefined

    if (shouldReindex) {
      const queueResponse = await getQueueWithResizeRetry(
        biketag,
        {
          game: biketagOpts.game,
          host: getQueueApiHost(biketagOpts.game),
          region: game.awsRegion,
          reindex: true,
          resize: shouldFix,
        },
        imageSource,
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
      mainTagsLoaded: [...mainContext.mainTagsByRound.keys()],
      orphanedFoundCandidates: storage.images
        .filter((image) => image.type === 'found')
        .flatMap((image) => {
          const targets =
            currentTag?.tagnumber !== undefined
              ? resolveOrphanTargetsForImage(image, currentTag.tagnumber)
              : []
          if (!targets.length) {
            const check = evaluateOrphanedQueueFoundForMain(image, mainContext, queue)
            return [
              {
                key: image.key,
                filenameRound: image.tagnumber,
                metadataRound: image.metadataTagnumber,
                targetRound: check.targetRound,
                structural: check.structural,
                playerVerified: check.playerVerified,
                playerConflict: check.playerConflict,
                reasons: check.reasons,
              },
            ]
          }
          return targets.map((targetRound) => {
            const check = evaluateOrphanedQueueFoundForTarget(
              image,
              targetRound,
              mainContext,
              queue,
            )
            return {
              key: image.key,
              filenameRound: image.tagnumber,
              metadataRound: image.metadataTagnumber,
              targetRound,
              structural: check.structural,
              playerVerified: check.playerVerified,
              playerConflict: check.playerConflict,
              reasons: check.reasons,
            }
          })
        }),
    })

    const summary = summarizeQueueIssues(issues)
    const fixableIssueCount = issues.filter(isFixableQueueIssue).length
    const deletableIssueCount = issues.filter(isDeletableQueueIssue).length
    const repairableIssueCount = issues.filter(isRepairableQueueIssue).length
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      clearedQueue: clearQueue,
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
