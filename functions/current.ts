import { builder, Handler } from '@netlify/functions'
import {
  getBikeTagClientOpts,
  getDomainInfo,
  getImgurImageSized,
  getPayloadOpts,
} from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import request from 'request'
import got from 'got'
import { Game } from 'biketag/lib/common/schema'

const currentTagHandler = async (event) => {
  const biketagOpts = getBikeTagClientOpts({
    ...event,
    method: event.httpMethod,
  } as unknown as request.Request)
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
  const currentTagResponse = await biketag.getTag(biketagPayload)

  if (currentTagResponse.success) {
    const currentTag = currentTagResponse.data
    const data: any = currentTag
    const domainInfo = getDomainInfo(event as unknown as request.Request)
    data.host = domainInfo.host
    data.imageUri = getImgurImageSized(data.mysteryImageUrl, biketagPayload.size)

    if (biketagPayload.data) {
      return {
        statusCode: 200,
        body: JSON.stringify(data),
      }
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      body: got.stream(data.imageUri).toString(),
    }
  }

  return {
    statusCode: currentTagResponse.status,
    body: currentTagResponse.error,
  }
}

const handler = builder(currentTagHandler as Handler)

export { handler }
