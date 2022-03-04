import { Handler } from '@netlify/functions'
import axios from 'axios'
import {
  isValidJson,
  getProfileAuthorization,
  acceptCorsHeaders,
  constructAmbassadorProfile,
  constructPlayerProfile,
} from './common/methods'

const profileHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  const headers = acceptCorsHeaders(false)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
    }
  }

  /// If all else fails
  let body = 'missing authorization header'
  let statusCode = 401
  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(event)

  /// We can only provide profile data if the profile exists
  if (profile && profile.sub) {
    let options = {}
    const authorizationHeaders = acceptCorsHeaders()

    switch (event.httpMethod) {
      case 'PUT':
        try {
          const data = JSON.parse(event.body)
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${profile.sub}`,
              headers: authorizationHeaders,
              data: {
                user_metadata: data,
              },
            }
          } else {
            body = 'bad request'
            statusCode = 400
          }
        } catch (e) {
          body = `patch failed: ${e.message ?? e}`
          statusCode = 400
        }
        break
      case 'PATCH':
        try {
          const data = JSON.parse(event.body)
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${profile.sub}`,
              headers: authorizationHeaders,
              data: {
                user_metadata: data,
              },
            }
          } else {
            body = 'bad request'
            statusCode = 400
          }
        } catch (e) {
          body = `patch failed: ${e.message ?? e}`
          statusCode = 400
        }
        break
      case 'GET':
        options = {
          method: 'GET',
          url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${profile.sub}?fields=user_metadata`,
          headers: authorizationHeaders,
        }
        break
      default:
        body = 'method not implemented'
        statusCode = 501
    }

    if (statusCode == 401) {
      await axios
        .request(options)
        .then(function (response) {
          if (typeof response.data === 'string') {
            body = response.data
          } else {
            const profileDataResponse = profile.isBikeTagAmbassador
              ? constructAmbassadorProfile(response.data, profile)
              : constructPlayerProfile(response.data, profile)
            body = JSON.stringify(profileDataResponse)
          }
          statusCode = 200
        })
        .catch(function (error) {
          statusCode = 500
          body = error.message
          console.error({ error })
        })
    }
  }

  return {
    statusCode,
    headers,
    body,
  }
}

export { profileHandler as handler }
