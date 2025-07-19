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

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  const profile = await getProfileAuthorization(req)
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

  // ✅ Authorization check
  if (!profile.isBikeTagAmbassador && profile.p_id !== biketagPayload.playerId) {
    return new Response('player not authorized to update', {
      status: HttpStatusCode.Unauthorized,
      headers,
    })
  }

  // ✅ Determine image source
  const imageSource = game.awsRegion ? 'aws' : 'imgur'
  if (imageSource === 'aws') {
    biketag.config({
      biketag: {
        host: process.env.HOST,
      },
      aws: {
        region: game.awsRegion,
      },
    }, false, true)
  }

  const updateResponse = await biketag.updateTag(biketagPayload, {
    source: imageSource,
  })
  const { success, data } = updateResponse
  console.log({biketagPayload, updateResponse})

  return new Response(JSON.stringify(success ? data : updateResponse), {
    status: updateResponse.status,
    headers,
  })
}
