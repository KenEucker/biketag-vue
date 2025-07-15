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
  /// TODO: get stats from sanity source first, then fire off new call to gather stats from imgur and save them into sanity
  const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
  if (imageSource === 'aws') {
    biketag.config(
      {
        aws: {
          region: game.awsRegion,
        },
      },
      false,
      true,
    )
  }
  const statsResponse = await biketag.getStats(biketagPayload, {
    source: imageSource,
  })
  const { success, data } = statsResponse
  return new Response(JSON.stringify(success ? data : statsResponse), {
    status: statsResponse.status,
    headers,
  })
}
