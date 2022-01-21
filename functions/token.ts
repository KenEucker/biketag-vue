import { builder, Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import request from 'request'
import { getBikeTagClientOpts, getBikeTagHash, getPayloadAuthorization } from '../src/common/utils'

const authorizeHandler: Handler = async (event) => {
  const authorization = getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = 401

  if (authorization) {
    const biketagOpts = getBikeTagClientOpts({
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request)
    const biketag = new BikeTagClient(biketagOpts)
    const config = biketag.config()
    const controlCheck = getBikeTagHash(new URL(`http://${event.headers.host}`).hostname)
    console.log({ authorization, imgur: config.imgur, controlCheck })
    const authorizationIsAccessToken =
      config.biketag.accessToken === authorization ||
      config.imgur?.refreshToken === authorization ||
      config.sanity?.token === authorization ||
      config.reddit?.refreshToken === authorization ||
      config.twitter?.bearer_token === authorization
    const authorizationIsClientToken = controlCheck === authorization

    if (authorizationIsAccessToken) {
      body = JSON.stringify({
        imgur: {
          clientId: config.imgur.clientId,
          clientSecret: config.imgur.clientSecret,
          refreshToken: config.imgur.refreshToken,
        },
      })
      statusCode = 200
    } else if (authorizationIsClientToken) {
      body = JSON.stringify({
        imgur: {
          clientId: config.imgur.clientId,
        },
      })
      statusCode = 200
    } else {
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
