import { Handler } from '@netlify/functions'
import { getDomainInfo } from '../src/common/utils'
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
      const data = results.data ?? results.body
      body = data

      if (statusCode === HttpStatusCode.Ok) {
        const dataIsArray = Array.isArray(data)
        const dataIsString = typeof data === 'string'
        const success = dataIsArray ? data?.length : !!data
        const profileFound = success ? (dataIsString ? JSON.parse(data) : data) : null

        // console.log({ profileFound })
        if (profileFound) {
          body = await getBikeTagPlayerProfile(profileFound, authorized, true)
        } else {
          body = 'no profile found'
          statusCode = HttpStatusCode.NotFound
        }
      }
    }

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile?.sub?.length) {
    /// If the profile sub (Auth0 field) exists (Authorized)
    await handleAuth0ProfileRequest(event, event.body, profile)
      .then(mergeProfilesIfSuccess())
      .catch(function (error) {
        statusCode = HttpStatusCode.InternalServerError
        body = error.message
      })
  } else if (event.httpMethod === 'GET' && profile?.name) {
    /// Else if the profile name is known and passed in via data and Authorized
    /// TODO: make this more secure
    await getBikeTagAuth0Profile(profile.name, true, profile.passcode)
      .then(mergeProfilesIfSuccess())
      .catch(function (error) {
        statusCode = HttpStatusCode.InternalServerError
        body = error.message
      })
  } else if (event.httpMethod === 'GET' && !profile) {
    /// Else get the public player profile by name via query string (Unauthorized)
    if (event.queryStringParameters?.name) {
      await getBikeTagPlayerProfile({ name: event.queryStringParameters.name }, true, true)
        .then((profile) => {
          if (profile) {
            statusCode = HttpStatusCode.Ok
            body = profile
          }
        })
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
  }

  return {
    statusCode,
    headers,
    body,
  }
}

export { profileHandler as handler }
