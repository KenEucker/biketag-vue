import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'
import { BikeTagClient } from 'biketag'
import { getGamePayload } from 'biketag/lib/common/payloads'
import request from 'request'

const gameHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true
  )
  console.log({ gameHandler: biketagOpts })
  const biketagPayload = getPayloadOpts(event, { game: biketagOpts.game })
  const biketag = new BikeTagClient(biketagOpts)
  const gameResponse = await biketag.getGame(biketagPayload as getGamePayload, { source: 'sanity' })
  const { success, data } = gameResponse

  return {
    statusCode: gameResponse.status,
    body: JSON.stringify(success ? data : gameResponse),
  }
}

const handler = builder(gameHandler)

export { handler }
