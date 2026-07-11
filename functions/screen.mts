import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
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
  screenImageWithRoboflow,
  validateQueueImageKeyForGame,
} from './common/screening'
import { ErrorMessage } from './common/constants'

const profileMatchesPlayerId = (profile: any, playerId: string): boolean =>
  profile?.p_id === playerId || profile?.sub === playerId

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

    if (req.method === 'GET') {
      const profile = await getProfileAuthorization(req)
      const payload = await getPayloadOpts(req)
      const playerId = payload.playerId ?? profile?.p_id ?? profile?.sub

      if (!playerId?.length || !profileMatchesPlayerId(profile, playerId)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: HttpStatusCode.Unauthorized,
          headers,
        })
      }

      const currentTag = (await biketag.getTag(undefined, { source: getImageSource(game) })).data
      const rejected = isScreeningEnabledForGame(game)
        ? await findPlayerRejectedUpload(game, currentTag?.tagnumber ?? 0, playerId)
        : undefined

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

    const profile = await getProfileAuthorization(req)
    const payload = await getPayloadOpts(req)
    const playerId = payload.playerId ?? profile?.p_id ?? profile?.sub

    if (payload.action === 'cleanup-rejected') {
      if (!playerId?.length || !profileMatchesPlayerId(profile, playerId)) {
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

      const currentTag = (await biketag.getTag(undefined, { source: getImageSource(game) })).data
      const imageKey = getStorageKeyFromUrl(cleanupImageUrl)
      if (
        !/--rejected/i.test(imageKey) ||
        !validateQueueImageKeyForGame(imageKey, biketagOpts.game, currentTag?.tagnumber ?? 0)
      ) {
        return new Response(JSON.stringify({ error: 'invalid rejected image' }), {
          status: HttpStatusCode.BadRequest,
          headers,
        })
      }

      const rejected = await findPlayerRejectedUpload(
        game,
        currentTag?.tagnumber ?? 0,
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

    if (!playerId?.length || !profileMatchesPlayerId(profile, playerId)) {
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

    if (!isScreeningConfigured(game)) {
      return new Response(JSON.stringify({ accepted: true, skipped: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    const currentTag = (await biketag.getTag(undefined, { source: getImageSource(game) })).data
    const currentRound = currentTag?.tagnumber ?? 0
    const imageKey = getStorageKeyFromUrl(imageUrl)

    if (!validateQueueImageKeyForGame(imageKey, biketagOpts.game, currentRound, imageType)) {
      return new Response(JSON.stringify({ error: 'invalid queue image' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    const screeningResult = await screenImageWithRoboflow(imageUrl)
    if (!screeningResult) {
      return new Response(JSON.stringify({ accepted: true, failOpen: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    if (screeningResult.accepted) {
      return new Response(JSON.stringify({ accepted: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    const renameResult = await renameQueueImageToRejected(
      game,
      imageUrl,
      screeningResult.reason,
      playerIp,
    )
    if (!renameResult.success || !renameResult.rejectedUrl) {
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
