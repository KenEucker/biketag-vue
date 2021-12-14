import { builder, Handler } from '@netlify/functions'
import { getDomainInfo } from '../src/common/methods'
import { BikeTagClient } from 'biketag'

const myHandler: Handler = async (event) => {
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
    body: gameResponse.success ? JSON.stringify(gameResponse.data) : gameResponse.error,
  }
}

const handler = builder(myHandler)

export { handler }
