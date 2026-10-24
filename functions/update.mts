import { BikeTagClient, Game, Tag } from 'biketag'
import { prepareTagMetadataUpdate } from './common/tag-update'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  HttpStatusCode,
  log,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[update-tag] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[update-tag] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: HttpStatusCode.MethodNotAllowed, headers })
  }

  try {
    const profile = await getProfileAuthorization(req)
    if (!profile?.sub && !profile?.p_id) {
      return new Response('player not authorized to update', {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }
    log('[update-tag] Profile authorization', {
      isValid: profile.isValid,
      isAmbassador: profile.isBikeTagAmbassador,
      p_id: profile.p_id,
    })

    const updatePayload = await getPayloadOpts(req)
    const input = updatePayload.tag ?? updatePayload
    const metadataOnly = updatePayload.metadataOnly === true
    if (metadataOnly && (!Number.isSafeInteger(input.tagnumber) || input.tagnumber < 1)) {
      return new Response(JSON.stringify({ error: 'A valid tag number is required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[update-tag] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[update-tag] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    if (!metadataOnly) {
      // Preserve the existing defaults for general SDK/queue updates.
      updatePayload.imgur = updatePayload.imgur ?? {}
      updatePayload.imgur.hash = game.queuehash
      updatePayload.folder = updatePayload.folder ?? 'queue'
    }

    const imageSource = getImageSource(game)
    log('[update-tag] Using image source', { imageSource })

    if (imageSource === 'aws') {
      biketag.config(
        {
          biketag: { host: process.env.HOST },
          aws: { region: game.awsRegion },
        },
        false,
        true,
      )
      log('[update-tag] AWS config applied', { region: game.awsRegion })
    }

    const ambassadorAndValid =
      profile.isBikeTagAmbassador && profile.sub && profile.sub === updatePayload.ambassadorId
    let tagUpdate = input
    // General SDK requests retain their image URLs, folder, resize and other options.
    let updateOptions: { source: typeof imageSource; [key: string]: unknown } = {
      source: imageSource,
    }
    let playerId = input.playerId

    if (metadataOnly) {
      updateOptions = {
        ...updateOptions,
        folder: 'main',
        hash: game.mainhash,
        cached: false,
        resize: false,
      }
      const existingResponse = await biketag.getTags(
        { game: biketagOpts.game, tagnumbers: [input.tagnumber] },
        updateOptions,
      )
      if (!existingResponse.success) {
        return new Response(JSON.stringify(existingResponse), {
          status:
            existingResponse.status >= 400 ? existingResponse.status : HttpStatusCode.BadRequest,
          headers,
        })
      }
      const existing = (existingResponse.data as Tag[]).find(
        (tag) => tag.tagnumber === input.tagnumber,
      )
      if (!existing) {
        return new Response(
          JSON.stringify({ error: `Tag #${input.tagnumber} not found in main` }),
          {
            status: HttpStatusCode.NotFound,
            headers,
          },
        )
      }
      playerId = existing.playerId
      try {
        tagUpdate = prepareTagMetadataUpdate(input, existing, biketagOpts.game, imageSource)
      } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
          status: HttpStatusCode.BadRequest,
          headers,
        })
      }
    }

    const playerValid = profile.p_id && profile.p_id === playerId
    if (!(ambassadorAndValid || playerValid)) {
      return new Response('player not authorized to update', {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    log('[update-tag] Prepared update', { tagUpdate, metadataOnly })
    const updateResponse = await biketag.updateTag(tagUpdate, updateOptions)
    log('[update-tag] updateTag response', {
      success: updateResponse.success,
      status: updateResponse.status,
      tagUpdate,
      response: updateResponse,
    })

    const { success, data } = updateResponse

    return new Response(JSON.stringify(success ? data : updateResponse), {
      status:
        !success && updateResponse.status < 400 ? HttpStatusCode.BadRequest : updateResponse.status,
      headers,
    })
  } catch (err: any) {
    log('[update-tag] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
