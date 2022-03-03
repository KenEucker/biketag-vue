import { Handler } from '@netlify/functions'
import axios from 'axios'
import { isValidJson, getPayloadAuthorization, acceptCorsHeaders } from './common/methods'

const profileHandler: Handler = async (event) => {
  const headers = acceptCorsHeaders(false)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
    }
  }

  let body = 'missing authorization header'
  let statusCode = 401
  const authorization = await getPayloadAuthorization(event)

  if (authorization) {
    let options = {}
    const authorizationHeaders = acceptCorsHeaders()

    switch (event.httpMethod) {
      case 'PUT':
        try {
          const data = JSON.parse(event.body)
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${authorization.sub}`,
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
          console.log({ data, authorization })
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${authorization.sub}`,
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
          url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${authorization.sub}?fields=user_metadata`,
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
          body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
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
