import { Handler } from '@netlify/functions'
import type { Game } from 'biketag'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/dist/common/payloads'
import request from 'request'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts, HttpStatusCode } from './common'

const tagsHandler: Handler = async (event) => {
  // ✅ Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    /// TODO: check request host
    const headers = acceptCorsHeaders()
    return {
      statusCode: HttpStatusCode.Ok,
      headers,
    }
  }

  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
  )
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = getPayloadOpts(event, {
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

const handler = tagsHandler

export { handler }
