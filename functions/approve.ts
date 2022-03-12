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
import { Ambassador, Game } from 'biketag/lib/common/schema'
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

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile && profile.sub) {
    const adminBiketagOpts = getBikeTagClientOpts(event as unknown as request.Request, true, true)
    const biketag = new BikeTagClient(adminBiketagOpts)
    const approvePayload = getPayloadOpts(event)

    const authorizationHeaders = acceptCorsHeaders(true)

    console.log({ approvePayload, profile, sub: profile.sub })
    let results = []
    let errors = []
    const approvePayloadIsValid =
      approvePayload?.btaId?.length > 0 &&
      approvePayload.tagnumber &&
      approvePayload.playerId?.length > 0

    if (approvePayloadIsValid) {
      const { playerId, tagnumber, btaId } = approvePayload
      const game = (await biketag.game()) as Game
      if (game) {
        const thisGamesAmbassadors = (await biketag.ambassadors()) as Ambassador[]
        const approvingBikeTagAmbassadorList = thisGamesAmbassadors.filter((a) => a.id === btaId)

        if (approvingBikeTagAmbassadorList.length) {
          const approvingBikeTagAmbassador = approvingBikeTagAmbassadorList[0]
          const activeQueue = await getActiveQueueForGame(game, adminBiketagOpts)
          const approvedTagList = activeQueue.queuedTags.filter((t) => {
            return t.tagnumber === tagnumber && t.playerId === playerId
          })
          if (approvedTagList.length) {
            const approvedTag = approvedTagList[0]
            const newBikeTagPostedResults = await setNewBikeTagPost(approvedTag, game)
            results.push({
              message: `Approving BikeTag Ambassador: ${approvingBikeTagAmbassador.name}`,
              ambassador: approvingBikeTagAmbassador.email,
              tag: approvedTag.tagnumber,
            })
            results = results.concat(newBikeTagPostedResults.results)
            errors = errors.concat(newBikeTagPostedResults.errors)
          }
        }
      } else {
        errors.push(`no game found: ${adminBiketagOpts.game}`)
      }
    }
    if (results.length) {
      return {
        statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
        body: JSON.stringify(results),
      }
    } else {
      console.log('nothing to report')
      return {
        statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
        body: '',
      }
    }
  }
}

export { approveHandler as handler }
