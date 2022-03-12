import { Handler } from '@netlify/functions'
import {
  acceptCorsHeaders,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getPayloadOpts,
  getProfileAuthorization,
  setNewBikeTagPost,
} from './common/methods'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { Game } from 'biketag/lib/common/schema'
import { HttpStatusCode } from './common/constants'

const approveHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders(false)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      body: 'method not allowed',
      statusCode: HttpStatusCode.MethodNotAllowed,
    }
  }

  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(event)
  const approvePayload = getPayloadOpts(event)
  let results = []
  let errors = []

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile && profile.sub === approvePayload.ambassadorId) {
    const biketagOpts = getBikeTagClientOpts(event as unknown as request.Request, true)
    const biketag = new BikeTagClient(biketagOpts)
    console.log({ c: biketag.config() })
    const { playerId, tagnumber } = approvePayload.tag
    const game = (await biketag.game()) as Game

    if (game) {
      const activeQueue = await getActiveQueueForGame(game, undefined, approvePayload.ambassadorId)
      const approvedTagList = activeQueue.completedTags.filter((t) => {
        return t.tagnumber === tagnumber && t.playerId === playerId
      })

      if (approvedTagList.length) {
        const approvedTag = approvedTagList[0]
        approvedTag.game = approvedTag.game.length ? approvedTag.game : game.name
        console.log({ approvedTag, approvedTagList })

        const newBikeTagPostedResults = await setNewBikeTagPost(approvedTag, game)
        results.push({
          message: `Approving BikeTag Ambassador: ${profile.name}`,
          ambassador: profile.email,
          tag: approvedTag.tagnumber,
        })
        results = results.concat(newBikeTagPostedResults.results)
        errors = errors.concat(newBikeTagPostedResults.errors)
      } else {
        errors.push(`tag could not be approved: ${biketagOpts.game}`)
      }
    } else {
      console.error({ biketagOpts })
      errors.push(`no game found: ${biketagOpts.game}`)
    }
  } else {
    return {
      statusCode: HttpStatusCode.Unauthorized,
      body: "you don't have permission to do that",
    }
  }

  if (results.length) {
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Accepted,
      body: JSON.stringify(results),
    }
  } else {
    console.log({ results, errors })
    return {
      statusCode: errors.length ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: '',
      errors,
    }
  }
}

export { approveHandler as handler }
