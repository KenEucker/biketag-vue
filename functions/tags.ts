import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'

const myHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(event)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.getGame(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = getPayloadOpts(event, {
    imgur: {
      hash: game.mainhash,
    },
    game: biketagOpts.game,
  })
  const tagsResponse = await biketag.getPlayers(biketagPayload as getTagsPayload, {
    source: 'imgur',
  })
  const { success, data } = tagsResponse
  console.log({ biketagPayload })
  return {
    statusCode: tagsResponse.status,
    body: JSON.stringify({ data: success ? data : tagsResponse, biketagPayload }),
  }
}

const handler = builder(myHandler)

export { handler }
