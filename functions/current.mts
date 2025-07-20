import axios from 'axios'
import { BikeTagClient, Game } from 'biketag'
import { getDomainInfo, getImageSized } from '../src/common'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts, log } from './common'
import { HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-tag-image] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-tag-image] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[get-tag-image] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)
    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[get-tag-image] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    const biketagPayload = await getPayloadOpts(req, {
      imgur: { hash: game.mainhash },
      game: biketagOpts.game,
      size: '',
      data: false,
    })
    log('[get-tag-image] Prepared biketag payload', biketagPayload)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    const currentTagResponse = await biketag.getTag(biketagPayload, { source: imageSource })

    if (currentTagResponse.success) {
      const currentTag = currentTagResponse.data
      const data: any = currentTag
      const domainInfo = getDomainInfo(req)
      const host = 'i.imgur.com'
      data.host = domainInfo.host
      data.imageUri = getImageSized('imgur', data.mysteryImageUrl, biketagPayload.size)

      log('[get-tag-image] Current tag details', {
        tag: currentTag.tagnumber,
        imageUri: data.imageUri,
      })

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
                'Content-Type': `image/jpg`,
              },
            })
          ).data,
          'utf-8',
        )

        log('[get-tag-image] Image fetched successfully', { imageUri: data.imageUri })

        return new Response(body, {
          status: 200,
          headers,
        })
      } catch (error) {
        log('[get-tag-image] Error fetching image', error, 'error')
      }
    } else {
      log('[get-tag-image] Current tag not found', { error: currentTagResponse.error }, 'warn')
    }

    return new Response(currentTagResponse.error, {
      status: currentTagResponse.status,
      headers,
    })
  } catch (err) {
    log('[get-tag-image] Unexpected error', err, 'error')
    return new Response('Internal server error', {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
