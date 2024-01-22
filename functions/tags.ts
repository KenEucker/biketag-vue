import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/dist/common/payloads'
import { Game } from 'biketag/dist/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const tagsHandler: Handler = async (event) => {
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
  const tagsResponse = await biketag.getTags(biketagPayload as getTagsPayload, {
    source: 'imgur',
  })
  const { success, data } = tagsResponse
  return {
    statusCode: tagsResponse.status,
    body: JSON.stringify(success ? data : tagsResponse),
  }
}

const handler = builder(tagsHandler)

export { handler }
