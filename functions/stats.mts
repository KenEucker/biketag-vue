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

  log('[get-stats] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-stats] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-stats] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-stats] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-stats] Prepared biketag payload', biketagPayload)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    log('[get-stats] Using image source', { imageSource })

    if (imageSource === 'aws') {
      biketag.config(
        {
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[get-stats] AWS config applied', { region: game.awsRegion })
    }

    const statsResponse = await biketag.getStats(biketagPayload, { source: imageSource })
    log('[get-stats] getStats response', {
      success: statsResponse.success,
      status: statsResponse.status,
    })

    const { success, data } = statsResponse

    return new Response(JSON.stringify(success ? data : statsResponse), {
      status: statsResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[get-stats] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
