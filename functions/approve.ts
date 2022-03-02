import { Handler } from '@netlify/functions'
import {
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getPayloadOpts,
  setNewBikeTagPost,
} from './common/methods'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { Ambassador, Game } from 'biketag/lib/common/schema'

const approveHandler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      body: 'method not allowed',
      statusCode: 405,
    }
  }

  const adminBiketagOpts = getBikeTagClientOpts(event as unknown as request.Request, true, true)
  const biketag = new BikeTagClient(adminBiketagOpts)
  const approvePayload = getPayloadOpts(event)
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
    console.log({ results })
    return {
      statusCode: errors ? 400 : 200,
      body: JSON.stringify(results),
    }
  } else {
    console.log('nothing to report')
    return {
      statusCode: errors ? 400 : 200,
      body: '',
    }
  }
}

export { approveHandler as handler }
