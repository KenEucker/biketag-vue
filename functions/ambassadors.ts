import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import { getAmbassadorsPayload } from 'biketag/lib/common/payloads'
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
  console.log({ biketagOpts, biketagPayload, game })
  const ambassadorsResponse = await biketag.getAmbassadors(
    biketagPayload as getAmbassadorsPayload,
    {
      source: 'imgur',
    }
  )
  const { success, data } = ambassadorsResponse

  return {
    statusCode: ambassadorsResponse.status,
    body: JSON.stringify(success ? data : ambassadorsResponse),
  }
}

const handler = builder(myHandler)

export { handler }
