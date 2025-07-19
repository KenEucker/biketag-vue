import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getPayloadOpts,
  getProfileAuthorization,
  log,
  setNewBikeTagPost,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[approve-tag] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[approve-tag] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    log('[approve-tag] Method not allowed', { method: req.method }, 'warn')
    return new Response(ErrorMessage.MethodNotAllowed, {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)
    log('[approve-tag] Profile authorization', { profile: profile?.sub ?? 'none' })

    const approvePayload = await getPayloadOpts(req)
    log('[approve-tag] Approve payload', approvePayload)

    let results: any[] = []
    let errors: any[] = []

    if (profile?.sub && profile.sub === approvePayload.ambassadorId) {
      log('[approve-tag] Ambassador attempting to approve tag', { name: profile.name })

      const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
      log('[approve-tag] Non-admin BikeTagClient options', nonAdminBiketagOpts)

      const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
      const game = (await nonAdminBiketag.game(undefined, { source: 'sanity' })) as Game
      log('[approve-tag] Retrieved game', { name: game?.name ?? 'none' })

      if (game) {
        const currentBikeTag = (await nonAdminBiketag.getTag()).data
        log('[approve-tag] Current bike tag', { tagnumber: currentBikeTag?.tagnumber })

        const adminBiketagOpts = getBikeTagClientOpts(req, true, true, game)
        const adminBiketag = new BikeTagClient(adminBiketagOpts)

        const activeQueue = await getActiveQueueForGame(
          game,
          adminBiketag,
          approvePayload.ambassadorId,
        )
        log('[approve-tag] Active queue loaded', {
          completedTags: activeQueue.completedTags.length,
        })

        const approvedTagList = activeQueue.completedTags.filter(
          (t) =>
            t.tagnumber === approvePayload.tag.tagnumber &&
            t.playerId === approvePayload.tag.playerId,
        )

        if (approvedTagList.length) {
          const approvedTag = approvedTagList[0]
          approvedTag.game = approvedTag.game.length ? approvedTag.game : game.name
          log('[approve-tag] Found tag to approve', {
            tagnumber: approvedTag.tagnumber,
            playerId: approvedTag.playerId,
          })

          const newBikeTagPostedResults = await setNewBikeTagPost(
            game,
            approvedTag,
            currentBikeTag,
            adminBiketag,
            nonAdminBiketag,
          )
          log('[approve-tag] setNewBikeTagPost results', newBikeTagPostedResults)

          results.push({
            message: `Approving BikeTag Ambassador: ${profile.name}`,
            ambassador: profile.email,
            tag: approvedTag.tagnumber,
          })
          results = results.concat(newBikeTagPostedResults.results)
          errors = errors.concat(newBikeTagPostedResults.errors)
        } else {
          log(
            '[approve-tag] Tag could not be approved',
            {
              game: nonAdminBiketagOpts.game,
              tagnumber: approvePayload.tag.tagnumber,
              playerId: approvePayload.tag.playerId,
            },
            'warn',
          )
          errors.push(`tag could not be approved: ${nonAdminBiketagOpts.game}`)
        }
      } else {
        log(
          '[approve-tag] No game found',
          { game: nonAdminBiketagOpts.game, biketagOpts: nonAdminBiketagOpts },
          'error',
        )
        errors.push(`no game found: ${nonAdminBiketagOpts.game}`)
      }
    } else {
      log('[approve-tag] Unauthorized attempt', { profile: profile?.sub ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const responsePayload = results.length ? results : errors
    const responseStatus = results.length
      ? errors[0]
        ? HttpStatusCode.BadRequest
        : HttpStatusCode.Accepted
      : errors.length
        ? HttpStatusCode.BadRequest
        : HttpStatusCode.Ok

    log('[approve-tag] Response summary', {
      status: responseStatus,
      resultsCount: results.length,
      errorsCount: errors.length,
    })

    return new Response(JSON.stringify(responsePayload), {
      headers,
      status: responseStatus,
    })
  } catch (err) {
    log('[approve-tag] Unhandled error', err, 'error')
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
