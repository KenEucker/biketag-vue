import { BikeTagClient, Game, Tag } from 'biketag'
import { normalizeTagTimestamps } from '../src/common/timestamps'
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

  log('[get-recent-tags] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const clientOptions = getBikeTagClientOpts(req, true)
    const gameName = clientOptions.game

    if (!gameName?.length) {
      return new Response(JSON.stringify({ error: 'A game must be specified' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    const biketag = new BikeTagClient({ ...clientOptions, game: gameName })
    const game = (await biketag.game(gameName, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    if (!game) {
      return new Response(JSON.stringify({ error: `Game not found: ${gameName}` }), {
        status: HttpStatusCode.NotFound,
        headers,
      })
    }

    const imageSource = getImageSource(game)
    if (imageSource === 'aws') {
      biketag.config(
        {
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
    }

    const payload = await getPayloadOpts(req, {
      hash: game.mainhash,
      game: game.slug || gameName,
      time: 'day',
      cached: false,
    })
    // Keep bucket selection and returned tag metadata tied to the host's game.
    payload.game = game.slug || gameName

    const recentResponse = await biketag.getTags(payload, {
      source: imageSource,
      cached: false,
    })

    if (!recentResponse.success) {
      return new Response(JSON.stringify({ error: 'Could not retrieve recent tags' }), {
        status: recentResponse.status || HttpStatusCode.BadGateway,
        headers,
      })
    }

    const cutoff = Date.now() / 1000 - 24 * 60 * 60
    const now = Date.now() / 1000
    const recentTags = (recentResponse.data as Tag[])
      .map(normalizeTagTimestamps)
      .filter(
        (tag) =>
          Number.isFinite(tag.mysteryTime) && tag.mysteryTime >= cutoff && tag.mysteryTime <= now,
      )

    return new Response(JSON.stringify(recentTags), {
      status: HttpStatusCode.Ok,
      headers,
    })
  } catch (err: any) {
    log('[get-recent-tags] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
