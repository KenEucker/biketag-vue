import { Handler } from '@netlify/functions'
import axios from 'axios'
import { isValidJson, getPayloadAuthorization, acceptCorsRequest } from './common/methods'

const profileHandler: Handler = async (event) => {
  // HEADERS['Vary'] = 'Origin'
  if (event.httpMethod === 'OPTIONS') {
    return acceptCorsRequest(event)
  }

  console.log(event.httpMethod)
  const authorization = await getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = 401

  if (authorization) {
    let options = {}

    switch (event.httpMethod) {
      case 'PUT':
        try {
          const data = JSON.parse(event.body)
          console.log({ data })
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${authorization.sub}`,
              headers: {
                authorization: `Bearer ${process.env.AUTH0_TOKEN}`,
                'content-type': 'application/json',
              },
              data,
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
          console.log({ data })
          if (isValidJson(data, 'profile')) {
            options = {
              method: 'PATCH',
              url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${authorization.sub}`,
              headers: {
                authorization: `Bearer ${process.env.AUTH0_TOKEN}`,
                'content-type': 'application/json',
              },
              data,
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
          headers: {
            authorization: `Bearer ${process.env.AUTH0_TOKEN}`,
            'content-type': 'application/json',
          },
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
          console.log({ success: response })
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
    body,
  }
}

export { profileHandler as handler }
