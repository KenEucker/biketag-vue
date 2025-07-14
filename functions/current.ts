import axios from 'axios'
import { BikeTagClient, Game } from 'biketag'
import { getDomainInfo, getImageSized } from '../src/common'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
import { HttpStatusCode } from './common/constants'

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
    size: '',
    data: false,
  })
  const currentTagResponse = await biketag.getTag(biketagPayload)

  if (currentTagResponse.success) {
    const currentTag = currentTagResponse.data
    const data: any = currentTag
    const domainInfo = getDomainInfo(req)
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