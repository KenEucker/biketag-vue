import { Handler } from '@netlify/functions'
import axios from 'axios'
import { ErrorMessage, HttpStatusCode, InfoMessage } from './common/constants'
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
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }
  /// If all else fails
  let body = 'missing authorization header'
  let statusCode = HttpStatusCode.Unauthorized
  /// Retrieves the authorization and profile data, if present
  const profile = await getProfileAuthorization(event)

  /// We can only provide profile data if the profile already exists (created by Auth0)
  if (profile && profile.sub) {
    let options = {}
    const authorizationHeaders = acceptCorsHeaders(true)

    switch (event.httpMethod) {
      /// Create new profile fields (role, name)
      case 'PUT':
        try {
          const data = JSON.parse(event.body)
          if (isValidJson(data, 'profile.role')) {
            const roles = (
              await axios.request({
                method: 'GET',
                url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}/roles`,
                headers: authorizationHeaders,
              })
            ).data
            const user_data = (
              await axios.request({
                method: 'GET',
                url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}?fields=user_metadata`,
                headers: authorizationHeaders,
              })
            ).data
            if (!roles.length && !user_data.user_metadata.name) {
              console.log(InfoMessage.ProfileInit, profile.sub)
              const exists = (
                await axios.request({
                  method: 'GET',
                  url: `https://${process.env.A_DOMAIN}/api/v2/users`,
                  params: {
                    page: 0,
                    per_page: 1,
                    include_totals: false,
                    fields: 'user_metadata.name',
                    q: `user_metadata.name:"${data.name}"`,
                    search_engine: 'v3',
                  },
                  headers: authorizationHeaders,
                })
              ).data
              if (!exists.length) {
                await axios.request({
                  method: 'POST',
                  url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}/roles`,
                  headers: authorizationHeaders,
                  data: {
                    roles: [
                      profile.isBikeTagAmbassador
                        ? process.env.AMBASSADOR_ROLE
                        : process.env.PLAYER_ROLE,
                    ],
                  },
                })

                /// Wire up the final request to be an update of the profile data
                options = {
                  method: 'PATCH',
                  url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}`,
                  headers: authorizationHeaders,
                  data,
                }
              } else {
                body = ErrorMessage.NameTaken
                statusCode = HttpStatusCode.BadRequest
              }
            } else {
              body = ErrorMessage.ProfileInitialized
              statusCode = HttpStatusCode.Forbidden
            }
          } else {
            body = ErrorMessage.InvalidRequestData
            statusCode = HttpStatusCode.BadRequest
          }
        } catch (e) {
          body = `${ErrorMessage.PatchFailed}: ${e.message ?? e}`
          statusCode = HttpStatusCode.BadRequest
        }
        break
      case 'PATCH':
        try {
          const data = JSON.parse(event.body)
          delete data.user_metadata.name
          const validator = profile.isBikeTagAmbassador
            ? 'profile.patch.ambassador'
            : 'profile.patch'
          const isValid = isValidJson(data, validator)
          if (isValid) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}`,
              headers: authorizationHeaders,
              data,
            }
          } else {
            console.log(data.user_metadata.credentials)
            console.log('data is not valid', data, validator)
            body = ErrorMessage.InvalidRequestData
            statusCode = HttpStatusCode.BadRequest
          }
        } catch (e) {
          body = `${ErrorMessage.PatchFailed}: ${e.message ?? e}`
          statusCode = HttpStatusCode.BadRequest
        }
        break
      case 'GET':
        options = {
          method: 'GET',
          url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}?fields=user_metadata`,
          headers: authorizationHeaders,
        }
        break
      default:
        body = ErrorMessage.MethodNotAllowed
        statusCode = HttpStatusCode.NotImplemented
    }

    if (statusCode == HttpStatusCode.Unauthorized) {
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
          statusCode = HttpStatusCode.Ok
        })
        .catch(function (error) {
          console.error(error)
          statusCode = HttpStatusCode.InternalServerError
          body = error.message
        })
    }
  } else if (event.httpMethod === 'GET' && profile?.name) {
    /// Check in Auth0 that the credentials are valid
    const authorizationHeaders = acceptCorsHeaders(true)
    try {
      const exists = (
        await axios.request({
          method: 'GET',
          url: `https://${process.env.A_DOMAIN}/api/v2/users`,
          params: {
            page: 0,
            per_page: 1,
            include_totals: false,
            fields: 'sub,user_metadata.name,user_metadata.passcode',
            q: `user_metadata.name:"${profile.name}"`,
            search_engine: 'v3',
          },
          headers: authorizationHeaders,
        })
      ).data
      if (exists.length) {
        const user_metadata = exists[0].user_metadata
        /// If the passcode isn't set then it defaults to an empty string
        user_metadata.passcode = user_metadata.passcode ?? ''

        if (user_metadata.passcode == profile.passcode) {
          body = exists[0].sub
          statusCode = HttpStatusCode.Ok
        } else {
          body = 'unauthorized'
          statusCode = HttpStatusCode.Unauthorized
        }
      } else {
        body = 'name not found'
        statusCode = HttpStatusCode.Ok
      }
    } catch (e) {
      console.error(e)
    }
  } else if (event.httpMethod === 'GET' && !profile) {
    if (event.queryStringParameters?.name) {
      const authorizationHeaders = acceptCorsHeaders(true)
      await axios
        .request({
          method: 'GET',
          url: `https://${process.env.A_DOMAIN}/api/v2/users`,
          params: {
            page: 0,
            per_page: 1,
            include_totals: false,
            fields: 'user_metadata.social,user_metadata.options',
            q: `user_metadata.name:"${event.queryStringParameters.name}"`,
            search_engine: 'v3',
          },
          headers: authorizationHeaders,
        })
        .then(function (response) {
          if (typeof response.data === 'string') {
            body = response.data
          } else {
            body = JSON.stringify(response.data)
          }
          statusCode = HttpStatusCode.Ok
        })
        .catch(function (error) {
          console.error(error)
          statusCode = HttpStatusCode.InternalServerError
          body = error.message
        })
    } else {
      body = ErrorMessage.InvalidRequestData
      statusCode = HttpStatusCode.BadRequest
    }
  }

  if (statusCode !== HttpStatusCode.Ok) {
    console.error(body)
  }

  return {
    statusCode,
    headers,
    body,
  }
}

export { profileHandler as handler }
