import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getAmbassadorsPayload } from 'biketag/dist/common/payloads'
import { Game } from 'biketag/dist/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const ambassadorsHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
  )
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = getPayloadOpts(event, {
    imgur: {
      hash: game.mainhash,
    },
    game: biketagOpts.game,
  })
  const ambassadorsResponse = await biketag.getAmbassadors(
    biketagPayload as getAmbassadorsPayload,
    {
      source: 'imgur',
    },
  )
  const { success, data } = ambassadorsResponse

  return {
    statusCode: ambassadorsResponse.status,
    body: JSON.stringify(success ? data : ambassadorsResponse),
  }
}

const handler = builder(ambassadorsHandler)

export { handler }
