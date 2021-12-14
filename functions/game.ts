import { builder, Handler } from '@netlify/functions'
import { getDomainInfo } from '../src/common/methods'
import { BikeTagClient } from 'biketag'

const myHandler: Handler = async (event, context) => {
  const domainInfo = getDomainInfo(event, undefined)
  const biketagOpts = {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
    sanity: {
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
    },
  }
  // comment added
  const biketag = new BikeTagClient(biketagOpts)
  const gameResponse = await biketag.getGame(biketagOpts.game, { source: 'sanity' })
  const { success, data } = gameResponse
  return {
    statusCode: gameResponse.status,
    body: JSON.stringify({
      game: success ? data : gameResponse,
      biketagOpts,
    }),
  }
}

const handler = builder(myHandler)

export { handler }
