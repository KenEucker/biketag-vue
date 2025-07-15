import { BikeTagClient, Game } from 'biketag'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts, HttpStatusCode } from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()
  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    /// TODO: check request host
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }
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
  const achievementsResponse = await biketag.getAchievements(
    biketagPayload,
    {
      source: imageSource,
    },
  )
  const { success, data } = achievementsResponse

  return new Response(JSON.stringify(success ? data : achievementsResponse), {
    status: achievementsResponse.status,
    headers,
  })
}

