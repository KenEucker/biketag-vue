import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadAuthorization,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'
import { sendScreeningRejectionEmail } from './common/screening/email'
import {
  deleteRejectedQueueImageGroup,
  findPlayerRejectedUpload,
  getMysteryUploadRemainingSeconds,
  getStorageKeyFromUrl,
  isScreeningConfigured,
  isScreeningEnabledForGame,
  renameQueueImageToRejected,
  resolveCurrentRound,
  screenImageWithRoboflow,
  validateQueueImageKeyForGame,
} from './common/screening'
import { ErrorMessage } from './common/constants'

const playerMatchesAuthorization = (
  authorization: Awaited<ReturnType<typeof getPayloadAuthorization>>,
  playerId: string,
): boolean => {
  if (!authorization?.isValid || !playerId?.length) return false

  if (authorization.type === 'jwt') {
    return authorization.profile?.p_id === playerId
  }

  if (authorization.type === 'bearer' || authorization.type === 'client') {
    const profileId = authorization.profile?.sub ?? authorization.profile?.p_id
    return profileId === playerId
  }

  return false
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[screen] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
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
    const authorization = await getPayloadAuthorization(req)

    if (req.method === 'GET') {
      const payload = await getPayloadOpts(req)
      const playerId = payload.playerId ?? authorization.profile?.p_id ?? authorization.profile?.sub
      const statusOnly = payload.statusOnly === 'true' || payload.statusOnly === true

      if (!playerMatchesAuthorization(authorization, playerId)) {
        log('[screen] Unauthorized GET', { playerId, authType: authorization.type }, 'warn')
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: HttpStatusCode.Unauthorized,
          headers,
        })
      }

      const currentRound = resolveCurrentRound(payload) ?? 0
      const rejected = isScreeningEnabledForGame(game)
        ? await findPlayerRejectedUpload(game, currentRound, playerId)
        : undefined

      if (statusOnly) {
        return new Response(
          JSON.stringify({
            rejected: rejected
              ? {
                  type: rejected.type,
                  imageUrl: rejected.url,
                  reason: rejected.reason,
                }
              : null,
          }),
          { status: HttpStatusCode.Ok, headers },
        )
      }

      const foundTime = parseInt(payload.foundTime, 10)
      const remainingSeconds =
        isScreeningConfigured(game) && Number.isFinite(foundTime)
          ? getMysteryUploadRemainingSeconds(foundTime)
          : 0

      return new Response(
        JSON.stringify({
          rejected: rejected
            ? {
                type: rejected.type,
                imageUrl: rejected.url,
                reason: rejected.reason,
              }
            : null,
          remainingSeconds,
          screeningEnabled: isScreeningConfigured(game),
        }),
        { status: HttpStatusCode.Ok, headers },
      )
    }

    if (req.method !== 'POST') {
      return new Response(ErrorMessage.MethodNotAllowed, {
        status: HttpStatusCode.MethodNotAllowed,
        headers,
      })
    }

    const payload = await getPayloadOpts(req)
    const playerId = payload.playerId ?? authorization.profile?.p_id ?? authorization.profile?.sub

    if (payload.action === 'cleanup-rejected') {
      if (!playerMatchesAuthorization(authorization, playerId)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: HttpStatusCode.Unauthorized,
          headers,
        })
      }

      const cleanupImageUrl = payload.imageUrl as string
      if (!cleanupImageUrl?.length) {
        return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
          status: HttpStatusCode.BadRequest,
          headers,
        })
      }

      const imageKey = getStorageKeyFromUrl(cleanupImageUrl)
      const currentRound = resolveCurrentRound(payload, imageKey) ?? 0
      if (
        !imageKey.startsWith('queue/') ||
        !/--rejected/i.test(imageKey) ||
        !validateQueueImageKeyForGame(imageKey, biketagOpts.game, currentRound)
      ) {
        return new Response(JSON.stringify({ error: 'invalid rejected image' }), {
          status: HttpStatusCode.BadRequest,
          headers,
        })
      }

      const rejected = await findPlayerRejectedUpload(
        game,
        currentRound,
        playerId,
      )
      if (!rejected || (rejected.url !== cleanupImageUrl && rejected.key !== imageKey)) {
        return new Response(JSON.stringify({ success: true }), {
          status: HttpStatusCode.Ok,
          headers,
        })
      }

      await deleteRejectedQueueImageGroup(game, cleanupImageUrl)

      return new Response(JSON.stringify({ success: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    const imageUrl = payload.imageUrl as string
    const imageType = payload.imageType as 'found' | 'mystery'
    const playerIp = payload.playerIP ?? payload.playerIp ?? payload.ip ?? ''
    const imageKey = getStorageKeyFromUrl(imageUrl)
    const currentRound = resolveCurrentRound(payload, imageKey, imageType)

    if (!playerMatchesAuthorization(authorization, playerId)) {
      log('[screen] Unauthorized POST', { playerId, authType: authorization.type }, 'warn')
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    if (!imageUrl?.length || (imageType !== 'found' && imageType !== 'mystery')) {
      return new Response(JSON.stringify({ error: 'imageUrl and imageType are required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!imageKey.startsWith('queue/')) {
      return new Response(JSON.stringify({ error: 'image must be a queue upload' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (currentRound === undefined) {
      return new Response(JSON.stringify({ error: 'currentRound is required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!isScreeningConfigured(game)) {
      log('[screen] Screening skipped — not configured for game', { game: game.name }, 'info')
      return new Response(JSON.stringify({ accepted: true, skipped: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    if (!validateQueueImageKeyForGame(imageKey, biketagOpts.game, currentRound, imageType)) {
      return new Response(JSON.stringify({ error: 'invalid queue image' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    log(
      '[screen] Screening queue image with Roboflow',
      { imageType, imageKey, currentRound, playerId },
      'info',
    )

    const screeningResult = await screenImageWithRoboflow(imageUrl)
    if (!screeningResult) {
      log('[screen] Roboflow screening fail-open', { imageType, imageUrl }, 'warn')
      return new Response(JSON.stringify({ accepted: true, failOpen: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    if (screeningResult.accepted) {
      log('[screen] Roboflow accepted image', { imageType, imageUrl }, 'info')
      return new Response(JSON.stringify({ accepted: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    log('[screen] Roboflow rejected image', {
      imageType,
      imageUrl,
      reason: screeningResult.reason,
    }, 'info')

    const renameResult = await renameQueueImageToRejected(
      game,
      imageUrl,
      screeningResult.reason,
      playerIp,
    )
    if (!renameResult.success || !renameResult.rejectedUrl) {
      log('[screen] Rejection rename failed — fail-open', { imageUrl }, 'warn')
      return new Response(JSON.stringify({ accepted: true, failOpen: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    const ambassadors = ((await biketag.ambassadors(undefined, {
      source: 'sanity',
    })) ?? []) as any[]
    const gameAmbassadors = ambassadors.filter((ambassador) =>
      game.ambassadors?.includes(ambassador.name),
    )

    const rejectedRecord = {
      key: renameResult.rejectedKey ?? '',
      url: renameResult.rejectedUrl,
      smallUrl: '',
      mediumUrl: '',
      type: imageType,
      tagnumber: imageType === 'found' ? currentRound : currentRound + 1,
      playerId,
      playerIp,
      reason: screeningResult.reason,
    }

    await sendScreeningRejectionEmail(game, gameAmbassadors, rejectedRecord, playerIp)

    return new Response(
      JSON.stringify({
        accepted: false,
        reason: screeningResult.reason,
        imageType,
        imageUrl: renameResult.rejectedUrl,
      }),
      { status: HttpStatusCode.Ok, headers },
    )
  } catch (error: any) {
    log('[screen] Unexpected error', error, 'error')
    return new Response(JSON.stringify({ accepted: true, failOpen: true }), {
      status: HttpStatusCode.Ok,
      headers,
    })
  }
}
