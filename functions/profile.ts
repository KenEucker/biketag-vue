import { Handler } from '@netlify/functions'
import { ErrorMessage, HttpStatusCode } from './common/constants'
import {
  acceptCorsHeaders,
  getBikeTagAuth0Profile,
  getBikeTagPlayerProfile,
  getProfileAuthorization,
  handleAuth0ProfileRequest,
} from './common/methods'

const profileHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders()
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }
  /// If all else fails
  let body: any = 'missing authorization header'
  let statusCode: number = HttpStatusCode.Unauthorized
  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(event)

  const mergeProfilesIfSuccess =
    (authorized = true) =>
    async (results) => {
      statusCode = results.statusCode ?? results.status
      body =
        statusCode === HttpStatusCode.Ok
          ? await getBikeTagPlayerProfile(JSON.parse(results.body), authorized, true)
          : results.body
    }

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile?.sub?.length) {
    await handleAuth0ProfileRequest(event.httpMethod, event.body, profile).then(
      mergeProfilesIfSuccess(),
    )
  } else if (event.httpMethod === 'GET' && profile?.name) {
    await getBikeTagAuth0Profile(profile.name, true)
      .then(mergeProfilesIfSuccess())
      .catch(function (error) {
        statusCode = HttpStatusCode.InternalServerError
        body = error.message
      })
  } else if (event.httpMethod === 'GET' && !profile) {
    /// Else get the public player profile by name via query string (Unauthorized)
    if (event.queryStringParameters?.name) {
      await getBikeTagAuth0Profile(event.queryStringParameters.name, true, profile.passcode)
        .then(mergeProfilesIfSuccess())
        .catch(function (error) {
          statusCode = HttpStatusCode.InternalServerError
          body = error.message
        })
    } else {
      body = ErrorMessage.InvalidRequestData
      statusCode = HttpStatusCode.BadRequest
    }
  }

  if (statusCode !== HttpStatusCode.Ok) {
    console.log(statusCode + ' profile retrieval error', body)
    statusCode = HttpStatusCode.InternalServerError
  }

  return {
    statusCode,
    headers,
    body,
  }
}

export { profileHandler as handler }
