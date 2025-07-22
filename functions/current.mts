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
    const biketagConfig = biketag.config({
      aws: {
        region: game.awsRegion,
      }
    }, false, true)

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
    const currentTagResponse = await biketag.getTag(biketagPayload, { source: imageSource })

    if (currentTagResponse.success) {
      const currentTag = currentTagResponse.data
      const data: any = currentTag
      const domainInfo = getDomainInfo(req)
      const host = imageSource ==='imgur' ? 'i.imgur.com' : biketagConfig.aws.endpoint?.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')
      data.imageUri = getImageSized(imageSource, data.mysteryImageUrl, biketagPayload.size)

      log('[get-tag-image] Current tag details', {
        tag: currentTag.tagnumber,
        imageUri: data.imageUri,
      })

      if (biketagPayload.data) {
        data.host = domainInfo.host
        return new Response(JSON.stringify(data), {
          status: HttpStatusCode.Ok,
          headers,
        })
      }

      try {
        const body =
            (await axios.get(data.imageUri, {
              responseType: 'arraybuffer',
              headers: {
                // host,
                'Content-Type': imageSource ==='imgur' ? `image/jpg` : `image/webp`,
              },
            })).data

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
  } catch (err: any) {
    log('[get-tag-image] Unexpected error', err, 'error')
    return new Response('Internal server error', {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
