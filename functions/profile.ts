import { Handler } from '@netlify/functions'
import * as jose from 'jose'
import axios from 'axios'
import { isValidJson, getPayloadAuthorization } from './common/methods'

const profileHandler: Handler = async (event) => {
  console.log(event.httpMethod)
  const authorization = getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = 401

  if (authorization) {
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
      )

      const { payload } = await jose.jwtVerify(authorization, JWKS)
      let options = {}

      switch (event.httpMethod) {
        case 'POST':
          try {
            const data = JSON.parse(event.body)
            if (isValidJson(data, 'profile')) {
              options = {
                method: 'PATCH',
                url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${payload.sub}`,
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
          } catch {
            body = 'bad request'
            statusCode = 400
          }
          break
        case 'GET':
          options = {
            method: 'GET',
            url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${payload.sub}?fields=user_metadata`,
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
            console.log(response.data)
            body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
            statusCode = 200
          })
          .catch(function (error) {
            statusCode = 500
            body = error.message
            console.error(error)
          })
      }
    } catch (e) {
      console.log({ authorizationValidationError: e })
      body = 'invalid authorization'
    }
  }

  return {
    statusCode,
    body,
  }
}

export { profileHandler as handler }
