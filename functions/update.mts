import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
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

  try {
    const profile = await getProfileAuthorization(req)
    log('[update-tag] Profile authorization', {
      isValid: profile.isValid,
      isAmbassador: profile.isBikeTagAmbassador,
      p_id: profile.p_id,
    })

    const updatePayload = await getPayloadOpts(req)
    const biketagOpts = getBikeTagClientOpts(req, true)
    log('[update-tag] Parsed BikeTagClient options', biketagOpts)

    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[update-tag] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

    updatePayload.imgur.hash = game.queuehash
    updatePayload.folder = updatePayload.folder ?? 'queue'
    log('[update-tag] Prepared biketag payload', updatePayload)
    const playerId = updatePayload.tag?.playerId ?? updatePayload.playerId

    const ambassadorAndValid =
      profile.isBikeTagAmbassador && profile?.sub && profile.sub === updatePayload.ambassadorId
    const playerValid = profile.p_id === playerId
    // Authorization check
    if (!(ambassadorAndValid || playerValid)) {
      log(
        '[update-tag] Authorization failure',
        { profilePId: profile.p_id, payloadPlayerId: playerId },
        'warn',
      )
      return new Response('player not authorized to update', {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    const imageSource = game.awsRegion ? 'aws' : 'imgur'
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

    const updateResponse = await biketag.updateTag(updatePayload.tag ?? updatePayload, {
      source: imageSource,
    })
    log('[update-tag] updateTag response', {
      success: updateResponse.success,
      status: updateResponse.status,
      updatePayload,
      response: updateResponse,
    })

    const { success, data } = updateResponse

    return new Response(JSON.stringify(success ? data : updateResponse), {
      status: updateResponse.status,
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
