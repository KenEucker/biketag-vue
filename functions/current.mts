import axios from 'axios'
import { BikeTagClient, Game } from 'biketag'
import { getDomainInfo, getImageSized } from '../src/common'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts } from './common'
import { HttpStatusCode } from './common/constants'

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
  const imageSource = game.awsRegion ? 'aws' : 'imgur'
  const currentTagResponse = await biketag.getTag(biketagPayload, {
    source: imageSource,
  })

  if (currentTagResponse.success) {
    const currentTag = currentTagResponse.data
    const data: any = currentTag
    const domainInfo = getDomainInfo(req)
    const host = 'i.imgur.com'
    data.host = domainInfo.host
    /// TODO: check the imageSource and send appropriate string
    data.imageUri = getImageSized('imgur', data.mysteryImageUrl, biketagPayload.size)

    if (biketagPayload.data) {
      return new Response(JSON.stringify(data), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    try {
      const body = Buffer.from(
        (
          await axios.get(data.imageUri, {
            responseType: 'arraybuffer',
            headers: {
              host,
              'Content-Type': `image/jpg`
            },
          })
        ).data,
        'utf-8',
      )

      return new Response(body, {
        status: 200,
        headers,
      })
    } catch (error) {
      console.error('Error fetching image:', error)
    }
  }

  return new Response(currentTagResponse.error, {
    status: currentTagResponse.status,
    headers,
  })
}