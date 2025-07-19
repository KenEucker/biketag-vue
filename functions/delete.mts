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

  log('[delete-tag] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[delete-tag] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)
    log('[delete-tag] Profile authorization', {
      p_id: profile.p_id,
      isAmbassador: profile.isBikeTagAmbassador,
    })
    const deletePayload = await getPayloadOpts(req)

    let body
    let status = HttpStatusCode.Unauthorized
    const ambassadorAndValid =
      profile.isBikeTagAmbassador && profile?.sub && profile.sub === deletePayload.ambassadorId
    const playerValid = profile.p_id === deletePayload.playerId

    if (ambassadorAndValid || playerValid) {
      const biketagOpts = getBikeTagClientOpts(req, true)
      log('[delete-tag] Parsed BikeTagClient options', biketagOpts)

      const biketag = new BikeTagClient(biketagOpts)
      const game = (await biketag.game(biketagOpts.game, {
        source: 'sanity',
        concise: true,
      })) as unknown as Game
      log('[delete-tag] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

      deletePayload.imgur = {...deletePayload.imgur, ...{ hash: game.queuehash }}
      deletePayload.game = deletePayload.game ?? biketagOpts.game
      deletePayload.folder = deletePayload.folder ?? 'queue'

      log('[delete-tag] Prepared biketag payload', deletePayload)
      const playerId = deletePayload.tag?.playerId ?? deletePayload.playerId

      if (!profile.isBikeTagAmbassador && profile.p_id !== playerId) {
        body = 'player not authorized to delete'
        status = HttpStatusCode.Unauthorized
        log('[delete-tag] Authorization failure', {
          profilePId: profile.p_id,
          payloadPlayerId: playerId,
        })
      } else {
        const imageSource = game.awsRegion ? 'aws' : 'imgur'
        log('[delete-tag] Using image source', { imageSource })

        if (imageSource === 'aws') {
          biketag.config(
            {
              biketag: { host: process.env.HOST },
              aws: { region: game.awsRegion },
            },
            false,
            true,
          )
          log('[delete-tag] AWS config applied', { host: process.env.HOST, region: game.awsRegion })
        }

        const deleteResponse = await biketag.deleteTag(deletePayload.tag ?? deletePayload, {
          source: imageSource,
        })
        log('[delete-tag] Delete tag response', {
          success: deleteResponse.success,
          status: deleteResponse.status,
        })

        const { success, data } = deleteResponse
        body = success ? data : deleteResponse
        status = deleteResponse.status
      }
    } else {
      log('[delete-tag] Profile invalid or not present')
    }

    return new Response(JSON.stringify(body), {
      status,
      headers,
    })
  } catch (err) {
    log('[delete-tag] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
