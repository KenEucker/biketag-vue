import { BikeTagClient, Game } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getAchievementsPayload } from 'biketag/dist/common/payloads'

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
  const achievementsResponse = await biketag.getAchievements(
    biketagPayload as getAchievementsPayload,
    {
      source: 'imgur',
    },
  )
  const { success, data } = achievementsResponse

  return new Response(JSON.stringify(success ? data : achievementsResponse), {
    status: achievementsResponse.status,
  })
}

