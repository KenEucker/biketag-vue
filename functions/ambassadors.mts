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

  log('[ambassadors] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[ambassadors] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[ambassadors] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[ambassadors] Retrieved game', {
      name: game.name,
      id: game._id,
      region: game.awsRegion,
    })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[ambassadors] Prepared payload for getAmbassadors', biketagPayload)

    const imageSource = getImageSource(game)
    log('[ambassadors] Using image source', { imageSource })

    const ambassadorsResponse = await biketag.getAmbassadors(biketagPayload, {
      source: imageSource,
    })
    log('[ambassadors] getAmbassadors response', {
      success: ambassadorsResponse.success,
      status: ambassadorsResponse.status,
      count: Array.isArray(ambassadorsResponse.data) ? ambassadorsResponse.data.length : 0,
    })

    return new Response(
      JSON.stringify(ambassadorsResponse.success ? ambassadorsResponse.data : ambassadorsResponse),
      {
        status: ambassadorsResponse.status,
        headers,
      },
    )
  } catch (err: any) {
    log('[ambassadors] Unexpected error', err, 'error')
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message ?? 'Unknown error',
      }),
      {
        status: HttpStatusCode.InternalServerError,
        headers,
      },
    )
  }
}
