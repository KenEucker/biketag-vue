import { BikeTagClient } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-game] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-game] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-game] Parsed BikeTagClient options', biketagOpts)

    const biketagPayload = await getPayloadOpts(req, { game: biketagOpts.game })
    log('[get-game] Prepared biketag payload', biketagPayload)

    const biketag = new BikeTagClient(biketagOpts)

    const gameResponse = await biketag.getGame(biketagPayload, { source: 'sanity' })
    log('[get-game] getGame response', {
      success: gameResponse.success,
      status: gameResponse.status,
    })

    const { success, data } = gameResponse

    return new Response(JSON.stringify(success ? data : gameResponse), {
      status: gameResponse.status,
      headers,
    })
  } catch (err) {
    log('[get-game] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
