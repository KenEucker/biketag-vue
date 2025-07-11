import { builder, Handler } from '@netlify/functions'
import axios from 'axios'
import type { Game } from 'biketag'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { getDomainInfo, getImageSized } from '../src/common'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
import { HttpStatusCode } from './common/constants'

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
    const host = 'i.imgur.com'
    data.host = domainInfo.host
    /// TODO: check the imageSource and send appropriate string
    data.imageUri = getImageSized('imgur', data.mysteryImageUrl, biketagPayload.size)

    if (biketagPayload.data) {
      return {
        statusCode: HttpStatusCode.Ok,
        body: JSON.stringify(data),
      }
    }

    try {
      const body = Buffer.from(
        (
          await axios.get(data.imageUri, {
            responseType: 'arraybuffer',
            headers: {
              host,
            },
          })
        ).data,
        'utf-8',
      ).toString('base64')

      return {
        statusCode: 200,
        isBase64Encoded: true,
        body,
      }
    } catch (error) {
      console.error('Error fetching image:', error)
    }
  }

  return {
    statusCode: currentTagResponse.status,
    body: currentTagResponse.error,
  }
}

const handler = builder(currentTagHandler as Handler)

export { handler }
