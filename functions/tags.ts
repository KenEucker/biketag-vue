import { BikeTagClient, Game } from 'biketag'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts, HttpStatusCode } from './common'
// @ts-ignore
import { getTagsPayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    /// TODO: check request host
    const headers = acceptCorsHeaders()
    return {
      statusCode: HttpStatusCode.Ok,
      headers,
    }
  }

  const biketagOpts = getBikeTagClientOpts(req, true)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = await getPayloadOpts(event, {
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

