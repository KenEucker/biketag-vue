import { Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'
import { HttpStatusCode } from './common/constants'
import {
  acceptCorsHeaders,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getPayloadOpts,
  getProfileAuthorization,
  setNewBikeTagPost,
} from './common/methods'

const approveHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders()
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      headers,
      body: 'method not allowed',
      statusCode: HttpStatusCode.MethodNotAllowed,
    }
  }

  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(event)
  const approvePayload = getPayloadOpts(event)
  let results: any[] = []
  let errors: any[] = []

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile?.sub && profile.sub === approvePayload.ambassadorId) {
    const { playerId, tagnumber } = approvePayload.tag

    const nonAdminBiketagOpts = getBikeTagClientOpts(event as unknown as request.Request, true)
    const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
    const game = (await nonAdminBiketag.game(undefined, { source: 'sanity' })) as Game

    if (game) {
      const currentBikeTag = (await nonAdminBiketag.getTag()).data
      const adminBiketagOpts = getBikeTagClientOpts(
        event as unknown as request.Request,
        true,
        undefined,
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
      console.error({ biketagOpts: nonAdminBiketagOpts })
      errors.push(`no game found: ${nonAdminBiketagOpts.game}`)
    }
  } else {
    return {
      headers,
      statusCode: HttpStatusCode.Unauthorized,
      body: "you don't have permission to do that",
    }
  }

  if (results.length) {
    // console.log({ results })
    return {
      headers,
      statusCode: errors[0] ? HttpStatusCode.BadRequest : HttpStatusCode.Accepted,
      body: JSON.stringify(results),
    }
  } else {
    // console.log({ results, errors })
    return {
      headers,
      statusCode: errors.length ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: '',
      errors,
    }
  }
}

export { approveHandler as handler }
