import { BikeTagClient, Game } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getPlayersPayload } from 'biketag/dist/common/payloads'

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
  const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
  const playersResponse = await biketag.getPlayers(biketagPayload as getPlayersPayload, {
    source: imageSource,
  })
  const { success, data } = playersResponse

  return new Response(JSON.stringify(success ? data : playersResponse), {
    status: playersResponse.status,
  })
}
