import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadAuthorization,
  getProfileAuthorization,
  log,
} from './common'
import { HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[fetch-signed-url] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[fetch-signed-url] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  let status = HttpStatusCode.Unauthorized
  let body: string = 'Missing or invalid authorization'

  try {
    const authProfile = await getPayloadAuthorization(req)
    const profile = await getProfileAuthorization(req)
    log('[fetch-signed-url] Authorization profile', {
      isValid: authProfile?.isValid,
      type: authProfile?.type,
      isAmbassador: profile?.isBikeTagAmbassador,
    })

    if (!authProfile?.isValid || !authProfile?.profile) {
      body = authProfile.reason === 'expired' ? 'Token expired' : 'Unauthorized or invalid token'
      log('[fetch-signed-url] Authorization failed', { reason: authProfile?.reason })
    } else {
      const adminBiketagOpts = getBikeTagClientOpts(req, true, true)
      const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
      const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)

      const gameResponse = await nonAdminBiketag.getGame(adminBiketagOpts.game, {
        source: 'sanity',
      })
      adminBiketagOpts.aws.region = gameResponse.data?.awsRegion
      const adminBiketag = new BikeTagClient(adminBiketagOpts)

      log('[fetch-signed-url] Retrieved game and region', {
        game: gameResponse.data?.name,
        region: gameResponse.data?.awsRegion,
      })

      const { key, game, p_id, contentType } = await req.json()
      log('[fetch-signed-url] Parsed request body', { key, game, p_id, contentType })

      if (key && game && contentType) {
        const playerValid =
          authProfile.type === 'jwt' && p_id === authProfile.profile.p_id
        const ambassadorValid = profile?.isBikeTagAmbassador

        if (playerValid || ambassadorValid) {
          const contentKeyMatch = `queue/${adminBiketagOpts.game}-tag`
          if (!key.startsWith(contentKeyMatch)) {
            log(
              '[fetch-signed-url] Key prefix mismatch',
              { key, expectedPrefix: contentKeyMatch },
              'warn',
            )
            throw new Error('Invalid key prefix')
          }

          const signedUrlResponse = await adminBiketag.fetchSignedUrl(
            {
              key,
              bucket: `${game}-biketag`,
              contentType,
              game,
              p_id,
            },
            { source: 'aws' },
          )

          log('[fetch-signed-url] fetchSignedUrl response', {
            success: signedUrlResponse.success,
            status: signedUrlResponse.status,
            playerValid,
            ambassadorValid,
          })

          if (signedUrlResponse.success) {
            status = HttpStatusCode.Ok
            body = signedUrlResponse.data
          } else {
            body = signedUrlResponse.error
            status = signedUrlResponse.status
          }
        } else {
          status = 400
          body = 'Player id does not match'
          log(
            '[fetch-signed-url] Player ID mismatch',
            {
              jwtPlayerId: authProfile.profile.p_id,
              requestedPlayerId: p_id,
              isAmbassador: profile?.isBikeTagAmbassador,
            },
            'warn',
          )
        }
      } else {
        status = 400
        body = 'Missing or invalid key combination'
        log('[fetch-signed-url] Invalid key combination', { key, game, contentType })
      }
    }
  } catch (err: any) {
    log('[fetch-signed-url] Unexpected error', err, 'error')
    status = HttpStatusCode.InternalServerError
    body = err.message || 'Unexpected error'
  }

  return new Response(body, {
    headers,
    status,
  })
}
