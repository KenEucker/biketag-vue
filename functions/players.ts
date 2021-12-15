import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import { getPlayersPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'

const myHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(event)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.getGame(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = getPayloadOpts(
    event.rawQuery,
    {
      imgur: {
        hash: game.mainhash,
      },
    },
    biketagOpts.game
  )
  const playersResponse = await biketag.getPlayers(biketagPayload as getPlayersPayload, {
    source: 'imgur',
  })
  const { success, data } = playersResponse

  return {
    statusCode: playersResponse.status,
    body: JSON.stringify({
      players: success ? data : playersResponse,
    }),
  }
}

const handler = builder(myHandler)

export { handler }
