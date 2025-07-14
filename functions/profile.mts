import {
  acceptCorsHeaders,
  getBikeTagAuth0Profile,
  getBikeTagPlayerProfile,
  getProfileAuthorization,
  handleAuth0ProfileRequest,
} from './common'
import { ErrorMessage, HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders()
  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }
  /// If all else fails
  let body: any = ErrorMessage.MissingAuthHeader
  let status: number = HttpStatusCode.Unauthorized

  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(req)

  const mergeProfilesIfSuccess =
    (authorized = true) =>
    async (results) => {
      status = results.statusCode ?? results.status
      const data = results.data ?? results.body
      body = data

      if (status === HttpStatusCode.Ok) {
        const dataIsArray = Array.isArray(data)
        const dataIsString = typeof data === 'string'
        const success = dataIsArray ? data?.length : !!data
        const profileFound = success ? (dataIsString ? JSON.parse(data) : data) : null

        // console.log({ profileFound })
        if (profileFound) {
          body = await getBikeTagPlayerProfile(profileFound, authorized, true)
        } else {
          body = ErrorMessage.ProfileNotFound
          status = HttpStatusCode.NotFound
        }
      }
    }

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile?.sub?.length) {
    /// If the profile sub (Auth0 field) exists (Authorized)
    await handleAuth0ProfileRequest(req, profile)
      .then(mergeProfilesIfSuccess())
      .catch(function (error) {
        status = HttpStatusCode.InternalServerError
        body = error.message
      })
  } else if (req.method === 'GET' && profile?.name) {
    /// Else if the profile name is known and passed in via data and Authorized
    /// TODO: make this more secure
    await getBikeTagAuth0Profile(profile.name, true, profile.passcode)
      .then(mergeProfilesIfSuccess())
      .catch(function (error) {
        status = HttpStatusCode.InternalServerError
        body = error.message
      })
  } else if (req.method === 'GET' && !profile) {
    /// Else get the public player profile by name via query string (Unauthorized)
    const queryStringParameters = new URL(req.url).searchParams
    if (queryStringParameters?.get('name')) {
      await getBikeTagPlayerProfile({ name: queryStringParameters.get('name') }, true, true)
        .then((profile) => {
          if (profile) {
            status = HttpStatusCode.Ok
            body = profile
          }
        })
        .catch(function (error) {
          status = HttpStatusCode.InternalServerError
          body = error.message
        })
    } else {
      body = ErrorMessage.InvalidRequestData
      status = HttpStatusCode.BadRequest
    }
  }

  if (status !== HttpStatusCode.Ok) {
    console.log(status + ' ' + ErrorMessage.ProfileNotRetrieved, body)
  }

  return new Response(body, {
    status,
    headers,
  })
}
