import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadAuthorization,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'
import { playerMatchesAuthorization } from './common/screening/auth'
import {
  deletePlayerRejectedUploadsForSlot,
  findPlayerRejectedUpload,
  getMysteryUploadRemainingSeconds,
  isScreeningConfigured,
  isScreeningEnabledForGame,
  reindexQueueAfterScreeningChange,
  resolveCurrentRound,
} from './common/screening'
import { ErrorMessage } from './common/constants'

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

    if (payload.action !== 'cleanup-rejected') {
      return new Response(JSON.stringify({ error: 'unsupported action' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!playerMatchesAuthorization(authorization, playerId)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    const imageType = payload.imageType as 'found' | 'mystery' | undefined
    const currentRound = resolveCurrentRound(payload) ?? 0

    if (!imageType || (imageType !== 'found' && imageType !== 'mystery')) {
      return new Response(JSON.stringify({ error: 'imageType is required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!currentRound) {
      return new Response(JSON.stringify({ error: 'currentRound is required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (getImageSource(game) === 'aws' && game.awsRegion?.length) {
      biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
    }

    const deletedCount = await deletePlayerRejectedUploadsForSlot(
      game,
      currentRound,
      playerId,
      imageType,
    )

    if (deletedCount > 0) {
      await reindexQueueAfterScreeningChange(game, biketag)
    }

    return new Response(JSON.stringify({ success: true, deleted: deletedCount > 0 }), {
      status: HttpStatusCode.Ok,
      headers,
    })
  } catch (error: any) {
    log('[screen] Unexpected error', error, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
