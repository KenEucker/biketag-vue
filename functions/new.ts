import { BikeTagClient, createTagObject, Game, Tag } from 'biketag'
import {
    acceptCorsHeaders,
    getBikeTagClientOpts,
    getImageSource,
    getPayloadOpts,
    getProfileAuthorization,
    log,
    setNewBikeTagPost,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()
  log('[new-tag] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[new-tag] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    log('[new-tag] Method not allowed', { method: req.method }, 'warn')
    return new Response(ErrorMessage.MethodNotAllowed, {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)
    log('[new-tag] Profile authorization', { profile: profile?.sub ?? 'none' })

    const payload = await getPayloadOpts(req)
    log('[new-tag] Payload received', payload)

    const {
      ambassadorId,
      game: gameName,
      tagnumber,
      foundPlayer,
      foundTime,
      foundLocation,
      foundImageUrl,
      mysteryPlayer,
      mysteryTime,
      mysteryImageUrl,
      hint,
    } = payload

    if (!profile?.sub || profile.sub !== ambassadorId) {
      log('[new-tag] Unauthorized attempt', { profile: profile?.sub ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const nonAdminOpts = getBikeTagClientOpts(req, true)
    const nonAdminBiketag = new BikeTagClient(nonAdminOpts)
    const game = (await nonAdminBiketag.game(undefined, { source: 'sanity' })) as Game
    const imageSource = getImageSource(game)

    if (!game?.name) {
      log('[new-tag] No game found', { game: gameName }, 'error')
      return new Response(`Game not found for: ${gameName}`, {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const updatedOpts = getBikeTagClientOpts(req, true, true, game)
    const adminBiketag = new BikeTagClient(updatedOpts)

    const currentBikeTag = (await adminBiketag.getTag(undefined, { source: imageSource })).data
    log('[new-tag] Current tag', { current: currentBikeTag?.tagnumber ?? 'none' })

    const newTag: Tag = createTagObject({
      game: game.name,
      tagnumber,
      foundPlayer,
      foundTime,
      foundLocation,
      foundImageUrl,
      mysteryPlayer,
      mysteryTime,
      mysteryImageUrl,
      hint,
    })

    const result = await setNewBikeTagPost(
      game,
      newTag,
      currentBikeTag,
      adminBiketag,
      nonAdminBiketag,
    )

    log('[new-tag] setNewBikeTagPost result', result)

    const status = result.errors
      ? HttpStatusCode.BadRequest
      : HttpStatusCode.Accepted

    return new Response(JSON.stringify(result), {
      headers,
      status,
    })

  } catch (err: any) {
    log('[new-tag] Unhandled error', err, 'error')
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message ?? 'Unknown error',
      }),
      {
        status: HttpStatusCode.InternalServerError,
        headers,
      }
    )
  }
}
