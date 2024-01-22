import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getQueuePayload } from 'biketag/dist/common/payloads'
import { Game } from 'biketag/dist/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const queueHandler: Handler = async (event) => {
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
  const queueResponse = await biketag.getQueue(biketagPayload as getQueuePayload, {
    source: 'imgur',
  })
  const { success, data } = queueResponse
  return {
    statusCode: queueResponse.status,
    body: JSON.stringify(success ? data : queueResponse),
  }
}

const handler = builder(queueHandler)

export { handler }
