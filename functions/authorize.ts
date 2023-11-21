import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { HttpStatusCode } from './common/constants'
import { getBikeTagClientOpts, getBikeTagHash, getPayloadOpts } from './common/methods'

const authorizeHandler: Handler = async (event) => {
  const {
    client_id: clientKey,
    client_secret: clientToken,
    access_token: accessToken,
    grant_type: grantType,
  } = getPayloadOpts(event)
  const self = new URL(`http://${event.headers.host}`).hostname
  const controlCheck = getBikeTagHash(self)
  let body = 'missing client key and token information'
  let statusCode = HttpStatusCode.Unauthorized

  // console.log({ clientKey, clientToken, accessToken, grantType, controlCheck, self })
  if (clientKey?.length > 0 && clientToken?.length > 0 && accessToken?.length > 0) {
    if (getBikeTagHash(clientKey) === clientToken && clientToken === controlCheck) {
      const biketagOpts = getBikeTagClientOpts(
        {
          ...event,
          method: event.httpMethod,
        } as unknown as request.Request,
        true,
      )
      const biketag = new BikeTagClient(biketagOpts)
      const config = biketag.config()
      const isValidAccessToken =
        config.biketag.accessToken === accessToken ||
        config.imgur?.refreshToken === accessToken ||
        config.sanity?.token === accessToken

      if (isValidAccessToken) {
        switch (grantType) {
          case 'refresh_token':
            body = getBikeTagHash(`${clientKey}${clientToken}${accessToken}`)
            statusCode = HttpStatusCode.Ok
            break
          default:
            body = 'grant type not supported'
            statusCode = HttpStatusCode.MethodNotAllowed
            break
        }
      } else {
        body = 'credentials do not pass control check'
      }
    } else {
      body = 'invalid access token'
    }
  }

  return {
    statusCode,
    body,
  }
}

const handler = builder(authorizeHandler)

export { handler }
