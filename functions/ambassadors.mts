import { BikeTagClient, Game } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getAmbassadorsPayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const biketagOpts = getBikeTagClientOpts(req, true)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = await getPayloadOpts(req, {
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

  return new Response(JSON.stringify(success ? data : ambassadorsResponse), {
    status: ambassadorsResponse.status,
  })
}

