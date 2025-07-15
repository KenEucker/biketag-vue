import { BikeTagClient } from 'biketag'
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
  const biketagPayload = await getPayloadOpts(req, { game: biketagOpts.game })
  const biketag = new BikeTagClient(biketagOpts)
  const gameResponse = await biketag.getGame(biketagPayload, { source: 'sanity' })
  const { success, data } = gameResponse

  return new Response(JSON.stringify(success ? data : gameResponse), {
    status: gameResponse.status,
    headers,
  })
}
