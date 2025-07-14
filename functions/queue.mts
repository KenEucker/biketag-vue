import { BikeTagClient, Game } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getQueuePayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const biketagOpts = getBikeTagClientOpts(req, true)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = await getPayloadOpts(req, {
    imgur: {
      hash: game.mainhash,
    },
    game: biketagOpts.game,
  })
  const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
  if (imageSource === 'aws') {
    biketag.config({
      aws: {
        region: game.awsRegion
      }
    }, false, true)
  }
  const queueResponse = await biketag.getQueue(biketagPayload as getQueuePayload, {
    source: imageSource,
  })
  const { success, data } = queueResponse
  
  return new Response(JSON.stringify(success ? data : queueResponse), {
    status: queueResponse.status,
  })
}
