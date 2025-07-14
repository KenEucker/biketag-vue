import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getPayloadOpts,
  getProfileAuthorization,
  setNewBikeTagPost,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders()
  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response(ErrorMessage.MethodNotAllowed, {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(req)
  const approvePayload = await getPayloadOpts(req)
  let results: any[] = []
  let errors: any[] = []

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile?.sub && profile.sub === approvePayload.ambassadorId) {
    const { playerId, tagnumber } = approvePayload.tag
    console.log('ambassador approving tag attempted')

    const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
    const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
    const game = (await nonAdminBiketag.game(undefined, { source: 'sanity' })) as Game

    if (game) {
      const currentBikeTag = (await nonAdminBiketag.getTag()).data
      const adminBiketagOpts = getBikeTagClientOpts(
        req,
        true,
        true,
        game,
      )
      // biketagOpts.cached = true
      const adminBiketag = new BikeTagClient(adminBiketagOpts)
      const activeQueue = await getActiveQueueForGame(
        game,
        adminBiketag,
        approvePayload.ambassadorId,
      )
      const approvedTagList = activeQueue.completedTags.filter((t) => {
        return t.tagnumber === tagnumber && t.playerId === playerId
      })

      if (approvedTagList.length) {
        const approvedTag = approvedTagList[0]
        approvedTag.game = approvedTag.game.length ? approvedTag.game : game.name
        // console.log({ approvedTag, approvedTagList })

        const newBikeTagPostedResults = await setNewBikeTagPost(
          game,
          approvedTag,
          currentBikeTag,
          adminBiketag,
          nonAdminBiketag,
        )
        results.push({
          message: `Approving BikeTag Ambassador: ${profile.name}`,
          ambassador: profile.email,
          tag: approvedTag.tagnumber,
        })
        results = results.concat(newBikeTagPostedResults.results)
        errors = errors.concat(newBikeTagPostedResults.errors)
      } else {
        errors.push(`tag could not be approved: ${nonAdminBiketagOpts.game}`)
      }
    } else {
      console.error(`no game found: ${nonAdminBiketagOpts.game}`, {
        biketagOpts: nonAdminBiketagOpts,
      })
      errors.push(`no game found: ${nonAdminBiketagOpts.game}`)
    }
  } else {
    return new Response("you don't have permission to do that", {
      headers,
      status: HttpStatusCode.Unauthorized,
    })
  }

  if (results.length) {
    // console.log({ results })
    return new Response(JSON.stringify(results), {
      headers,
      status: errors[0] ? HttpStatusCode.BadRequest : HttpStatusCode.Accepted,
    })
  } else {
    // console.log({ results, errors })
    return new Response(JSON.stringify(errors), {
      headers,
      status: errors.length ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  }
}

