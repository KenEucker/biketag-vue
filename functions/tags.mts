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

  log('[get-tags] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-tags] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-tags] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-tags] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
    })
    log('[get-tags] Prepared biketag payload', biketagPayload)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    log('[get-tags] Using image source', { imageSource })

    if (imageSource === 'aws') {
      biketag.config(
        {
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[get-tags] AWS config applied', { region: game.awsRegion })
    }

    const tagsResponse = await biketag.getTags(biketagPayload, { source: imageSource })
    log('[get-tags] getTags response', {
      success: tagsResponse.success,
      status: tagsResponse.status,
      count: Array.isArray(tagsResponse.data) ? tagsResponse.data.length : 0,
    })

    const { success, data } = tagsResponse

    return new Response(JSON.stringify(success ? data : tagsResponse), {
      status: tagsResponse.status,
      headers,
    })
  } catch (err) {
    log('[get-tags] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
