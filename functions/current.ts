import { builder, Handler } from '@netlify/functions'
import axios from 'axios'
import { BikeTagClient } from 'biketag'
import { Game } from 'biketag/dist/common/schema'
import request from 'request'
import { getDomainInfo, getImgurImageSized } from '../src/common/utils'
import { HttpStatusCode } from './common/constants'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const currentTagHandler = async (event) => {
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
    size: '',
    data: false,
  })
  const currentTagResponse = await biketag.getTag(biketagPayload)

  if (currentTagResponse.success) {
    const currentTag = currentTagResponse.data
    const data: any = currentTag
    const domainInfo = getDomainInfo(event)
    data.host = domainInfo.host
    data.imageUri = getImgurImageSized(data.mysteryImageUrl, biketagPayload.size)

    if (biketagPayload.data) {
      return {
        statusCode: HttpStatusCode.Ok,
        body: JSON.stringify(data),
      }
    }

    const body = Buffer.from(
      (
        await axios.get(data.imageUri, {
          responseType: 'arraybuffer',
        })
      ).data,
      'utf-8',
    ).toString('base64')

    return {
      statusCode: 200,
      isBase64Encoded: true,
      body,
    }
  }

  return {
    statusCode: currentTagResponse.status,
    body: currentTagResponse.error,
  }
}

const handler = builder(currentTagHandler as Handler)

export { handler }
