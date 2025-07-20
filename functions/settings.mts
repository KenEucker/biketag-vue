import type { Game } from 'biketag'
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

  log('[get-settings] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-settings] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-settings] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-settings] Retrieved game', { name: game.name })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-settings] Prepared biketag payload', biketagPayload)

    const settingsResponse = await biketag.getSettings(biketagPayload, { source: 'sanity' })
    log('[get-settings] getSettings response', {
      success: settingsResponse.success,
      status: settingsResponse.status,
    })

    const { success, data } = settingsResponse

    return new Response(JSON.stringify(success ? data : settingsResponse), {
      status: settingsResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[get-settings] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
