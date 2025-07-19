import {
  acceptCorsHeaders,
  getBikeTagAuth0Profile,
  getBikeTagPlayerProfile,
  getProfileAuthorization,
  handleAuth0ProfileRequest,
  log,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[profile] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[profile] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  let body: any = ErrorMessage.MissingAuthHeader
  let status: number = HttpStatusCode.Unauthorized

  try {
    const profile = await getProfileAuthorization(req)
    log('[profile] Profile authorization', { profile })

    const mergeProfilesIfSuccess =
      (authorized = true) =>
      async (results) => {
        status = results.statusCode ?? results.status
        const data = results.data ?? results.body
        body = data

        log('[profile] mergeProfilesIfSuccess result', { status, data })

        if (status === HttpStatusCode.Ok) {
          const dataIsArray = Array.isArray(data)
          const dataIsString = typeof data === 'string'
          const success = dataIsArray ? data?.length : !!data
          const profileFound = success ? (dataIsString ? JSON.parse(data) : data) : null

          if (profileFound) {
            body = await getBikeTagPlayerProfile(profileFound, authorized, true)
            log('[profile] Merged profile successfully', { profile: body })
          } else {
            body = ErrorMessage.ProfileNotFound
            status = HttpStatusCode.NotFound
            log('[profile] Profile not found after mergeProfilesIfSuccess')
          }
        }
      }

    if (profile?.sub?.length) {
      log('[profile] Auth0 profile found', { sub: profile.sub })
      await handleAuth0ProfileRequest(req, profile)
        .then(mergeProfilesIfSuccess())
        .catch((error) => {
          status = HttpStatusCode.InternalServerError
          body = error.message
          log('[profile] Error in handleAuth0ProfileRequest', { error }, 'error')
        })
    } else if (req.method === 'GET' && profile?.name) {
      log('[profile] Profile.name fallback path', { name: profile.name })
      await getBikeTagAuth0Profile(profile.name, true, profile.passcode)
        .then(mergeProfilesIfSuccess())
        .catch((error) => {
          status = HttpStatusCode.InternalServerError
          body = error.message
          log('[profile] Error in getBikeTagAuth0Profile', { error }, 'error')
        })
    } else if (req.method === 'GET' && !profile) {
      const queryStringParameters = new URL(req.url).searchParams
      const playerName = queryStringParameters?.get('name')
      log('[profile] Public profile lookup path', { playerName })

      if (playerName) {
        await getBikeTagPlayerProfile({ name: playerName }, true, true)
          .then((resultProfile) => {
            if (resultProfile) {
              status = HttpStatusCode.Ok
              body = resultProfile
              log('[profile] Public profile found', { profile: resultProfile })
            }
          })
          .catch((error) => {
            status = HttpStatusCode.InternalServerError
            body = error.message
            log('[profile] Error in getBikeTagPlayerProfile (public)', { error }, 'error')
          })
      } else {
        body = ErrorMessage.InvalidRequestData
        status = HttpStatusCode.BadRequest
        log('[profile] Missing player name query parameter')
      }
    }

    if (status !== HttpStatusCode.Ok) {
      log('[profile] Profile not retrieved', { status, body }, 'warn')
    }
  } catch (err) {
    log('[profile] Unexpected error', err, 'error')
    status = HttpStatusCode.InternalServerError
    body = 'Internal server error'
  }

  return new Response(body, {
    status,
    headers,
  })
}
