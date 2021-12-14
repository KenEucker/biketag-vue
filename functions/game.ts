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
  const biketag = new BikeTagClient(biketagOpts)
  const gameResponse = await biketag.getGame(biketagOpts.game, { source: 'sanity' })
  return {
    statusCode: gameResponse.status,
    body: JSON.stringify({
      gmae: gameResponse.success ? gameResponse.data : gameResponse,
      event,
      context,
    }),
  }
}

const handler = builder(myHandler)

export { handler }
