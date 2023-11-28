import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const recentHandler: Handler = async (event) => {
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
    game: 'none',
    time: 'day',
  })
  const recentResponse = await biketag.getTags(biketagPayload as getTagsPayload, {
    source: 'imgur',
  })
  const { success, data } = recentResponse
  return {
    statusCode: recentResponse.status,
    body: JSON.stringify(success ? data : recentResponse),
  }
}

const handler = builder(recentHandler)

export { handler }
