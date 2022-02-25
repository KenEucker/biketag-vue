import { builder, Handler } from '@netlify/functions'
import * as jose from 'jose'
import axios from 'axios'
import { getPayloadAuthorization } from './common/methods'

const authorizeHandler: Handler = async (event) => {
  const authorization = getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = 401

  if (authorization) {
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
      )

      const { payload } = await jose.jwtVerify(authorization, JWKS)

      await axios
        .request({
          method: 'PATCH',
          url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${payload.sub}`,
          headers: {
            authorization: `Bearer ${process.env.AUTH0_TOKEN}`,
            'content-type': 'application/json',
          },
          data: { user_metadata: { social: { reddit: 'yourmother' } } },
        })
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

const handler = builder(authorizeHandler)

export { handler }
