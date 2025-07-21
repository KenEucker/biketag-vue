import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-players] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-players] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-players] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-players] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-players] Prepared biketag payload', biketagPayload)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    log('[get-players] Using image source', { imageSource })

    if (imageSource === 'aws') {
      biketag.config(
        {
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[get-players] AWS config applied', { region: game.awsRegion })
    }

    const playersResponse = await biketag.getPlayers(biketagPayload, { source: imageSource })
    log('[get-players] getPlayers response', {
      success: playersResponse.success,
      status: playersResponse.status,
      count: Array.isArray(playersResponse.data) ? playersResponse.data.length : 0,
    })

    const { success, data } = playersResponse

    return new Response(JSON.stringify(success ? data : playersResponse), {
      status: playersResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[get-players] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
