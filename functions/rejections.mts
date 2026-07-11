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
import {
  deleteRejectedQueueImageGroup,
  getStorageKeyFromUrl,
  inferRejectedImageRole,
  listRejectedQueueImagesForRound,
  playerHasQueueFoundImage,
  restoreRejectedQueueImage,
  validateQueueImageKeyForGame,
} from './common/screening'
import { ErrorMessage } from './common/constants'

const profileMatchesPlayerId = (profile: any, playerId: string): boolean =>
  profile?.p_id === playerId || profile?.sub === playerId

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[rejections] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)
    const biketagOpts = getBikeTagClientOpts(req, true)
    const biketag = new BikeTagClient(biketagOpts)
    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    const imageSource = getImageSource(game)

    if (imageSource === 'aws' && game.awsRegion?.length) {
      biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
    }

    const currentTag = (await biketag.getTag(undefined, { source: imageSource })).data
    const currentRound = currentTag?.tagnumber ?? 0

    if (req.method === 'GET') {
      const payload = await getPayloadOpts(req)
      const playerId = payload.playerId ?? profile?.p_id ?? profile?.sub

      if (payload.scope === 'player') {
        if (!playerId?.length || !profileMatchesPlayerId(profile, playerId)) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: HttpStatusCode.Unauthorized,
            headers,
          })
        }

        const rejected = (await listRejectedQueueImagesForRound(game, currentRound)).filter(
          (image) => image.playerId === playerId,
        )

        return new Response(JSON.stringify({ rejected: rejected[0] ?? null }), {
          status: HttpStatusCode.Ok,
          headers,
        })
      }

      if (!profile?.sub || profile.sub !== payload.ambassadorId) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: HttpStatusCode.Unauthorized,
          headers,
        })
      }

      const rejected = await listRejectedQueueImagesForRound(game, currentRound)

      return new Response(JSON.stringify({ rejected }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    if (req.method !== 'POST') {
      return new Response(ErrorMessage.MethodNotAllowed, {
        status: HttpStatusCode.MethodNotAllowed,
        headers,
      })
    }

    const payload = await getPayloadOpts(req)
    if (!profile?.sub || profile.sub !== payload.ambassadorId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    const action = payload.action as 'approve' | 'delete'
    const imageUrl = payload.imageUrl as string
    const imageKey = getStorageKeyFromUrl(imageUrl)

    if (!action || !imageUrl?.length) {
      return new Response(JSON.stringify({ error: 'action and imageUrl are required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!validateQueueImageKeyForGame(imageKey, biketagOpts.game, currentRound)) {
      return new Response(JSON.stringify({ error: 'invalid rejected image' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (action === 'delete') {
      await deleteRejectedQueueImageGroup(game, imageUrl)
      return new Response(JSON.stringify({ success: true }), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    if (action !== 'approve') {
      return new Response(JSON.stringify({ error: 'unsupported action' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    const rejectedImages = await listRejectedQueueImagesForRound(game, currentRound)
    const rejected = rejectedImages.find(
      (image) => image.url === imageUrl || image.key === imageKey,
    )

    if (!rejected) {
      return new Response(JSON.stringify({ error: 'rejected image not found' }), {
        status: HttpStatusCode.NotFound,
        headers,
      })
    }

    const targetRole =
      rejected.type ??
      inferRejectedImageRole(rejected.tagnumber, currentRound)

    if (!targetRole) {
      return new Response(JSON.stringify({ error: 'unable to determine image role' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (targetRole === 'mystery') {
      const playerId = rejected.playerId ?? ''
      const hasFoundImage = playerId.length
        ? await playerHasQueueFoundImage(game, playerId, currentRound)
        : false

      if (!hasFoundImage) {
        return new Response(
          JSON.stringify({
            error: 'The related found image is missing, so this mystery image cannot be approved.',
          }),
          { status: HttpStatusCode.BadRequest, headers },
        )
      }
    }

    const restoreResult = await restoreRejectedQueueImage(game, imageUrl, targetRole)
    if (!restoreResult.success || !restoreResult.restoredUrl) {
      return new Response(JSON.stringify({ error: 'failed to restore rejected image' }), {
        status: HttpStatusCode.InternalServerError,
        headers,
      })
    }

    if (targetRole === 'mystery') {
      const queueResponse = await biketag.getQueue(undefined, { source: imageSource })
      const queuedTags = queueResponse.success ? (queueResponse.data as any[]) : []
      const playerTag = queuedTags.find(
        (tag) => tag.playerId === rejected.playerId && tag.foundImageUrl?.length,
      )

      if (!playerTag) {
        return new Response(
          JSON.stringify({
            error: 'The related found image is missing, so this mystery image cannot be approved.',
          }),
          { status: HttpStatusCode.BadRequest, headers },
        )
      }

      const submissionTag = {
        ...playerTag,
        mysteryImageUrl: restoreResult.restoredUrl,
        tagnumber: rejected.tagnumber,
        game: biketagOpts.game,
        playerId: rejected.playerId,
      }

      const queueTagResponse = await biketag.queueTag(submissionTag, { source: imageSource })
      if (!queueTagResponse.success) {
        return new Response(JSON.stringify({ error: queueTagResponse.error ?? 'submission failed' }), {
          status: HttpStatusCode.InternalServerError,
          headers,
        })
      }

      await biketag.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
    }

    return new Response(
      JSON.stringify({
        success: true,
        restoredUrl: restoreResult.restoredUrl,
        type: targetRole,
      }),
      { status: HttpStatusCode.Ok, headers },
    )
  } catch (error: any) {
    log('[rejections] Unexpected error', error, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
