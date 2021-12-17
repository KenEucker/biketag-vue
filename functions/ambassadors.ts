import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import { getAmbassadorsPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'

const myHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(event as unknown as request.Request)
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
  console.log({ biketagPayload })
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
