import { BikeTagClient, createTagObject, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getPayloadOpts,
  getProfileAuthorization,
  launchGameTag,
  log,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()
  log('[launch-game] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[launch-game] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    log('[launch-game] Method not allowed', { method: req.method }, 'warn')
    return new Response(ErrorMessage.MethodNotAllowed, {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)
    log('[launch-game] Profile authorization', { profile: profile?.sub ?? 'none' })

    const payload = await getPayloadOpts(req)
    log('[launch-game] Payload received', payload)

    const {
      ambassadorId,
      game: gameName,
      playerId,
      mysteryPlayer,
      mysteryTime,
      mysteryImageUrl,
      hint,
    } = payload

    if (!profile?.sub || profile.sub !== ambassadorId || !profile.isBikeTagAmbassador) {
      log('[launch-game] Unauthorized attempt', { profile: profile?.sub ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const nonAdminOpts = getBikeTagClientOpts(req, true)
    const nonAdminBiketag = new BikeTagClient(nonAdminOpts)
    const game = (await nonAdminBiketag.game(undefined, { source: 'sanity' })) as Game

    if (!game?.name) {
      log('[launch-game] No game found', { game: gameName }, 'error')
      return new Response(`Game not found for: ${gameName}`, {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const updatedOpts = getBikeTagClientOpts(req, true, true, game)
    const adminBiketag = new BikeTagClient(updatedOpts)

    const gameSlug = getGameStorageSlug(game, gameName)

    const launchTag: Tag = createTagObject({
      game: gameSlug,
      tagnumber: 1,
      playerId,
      mysteryPlayer,
      mysteryTime,
      mysteryImageUrl,
      hint,
    })

    const result = await launchGameTag(game, launchTag, adminBiketag)

    log('[launch-game] launchGameTag result', result)

    const status = result.errors ? HttpStatusCode.BadRequest : HttpStatusCode.Accepted

    return new Response(JSON.stringify(result), {
      headers,
      status,
    })
  } catch (err: any) {
    log('[launch-game] Unhandled error', err, 'error')
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
