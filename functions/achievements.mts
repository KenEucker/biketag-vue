import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-achievements] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-achievements] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-achievements] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-achievements] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-achievements] Prepared biketag payload', biketagPayload)

    const imageSource = getImageSource(game)
    log('[get-achievements] Using image source', { imageSource })

    const achievementsResponse = await biketag.getAchievements(biketagPayload, {
      source: imageSource,
    })
    log('[get-achievements] getAchievements response', {
      success: achievementsResponse.success,
      status: achievementsResponse.status,
      count: Array.isArray(achievementsResponse.data) ? achievementsResponse.data.length : 0,
    })

    const { success, data } = achievementsResponse

    return new Response(JSON.stringify(success ? data : achievementsResponse), {
      status: achievementsResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[get-achievements] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
