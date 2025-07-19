import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  getProfileAuthorization,
  HttpStatusCode,
} from './common'

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

  const profile = await getProfileAuthorization(req)
  let body,
    status = HttpStatusCode.Unauthorized

  if (profile.isValid) {
    const biketagOpts = getBikeTagClientOpts(req, true)
    const biketag = new BikeTagClient(biketagOpts)
    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    const biketagPayload = await getPayloadOpts(req, {
      imgur: {
        hash: game.queuehash,
      },
      game: biketagOpts.game,
      folder: 'queue',
    })

    if (!profile.isBikeTagAmbassador && profile.p_id !== biketagPayload.playerId) {
      body = 'player not authorized to delete'
      status = HttpStatusCode.Unauthorized
    } else {
      const imageSource = game.awsRegion ? 'aws' : 'imgur'
      if (imageSource === 'aws') {
        biketag.config(
          {
            biketag: {
              host: process.env.HOST,
            },
            aws: {
              region: game.awsRegion,
            },
          },
          false,
          true,
        )
      }
      const deleteResponse = await biketag.deleteTag(biketagPayload, {
        source: imageSource,
      })
      const { success, data } = deleteResponse
      body = success ? data : deleteResponse
      status = deleteResponse.status
    }
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}
