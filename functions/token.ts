import { Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadAuthorization } from './common/methods'

const tokenHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  let headers = acceptCorsHeaders(false)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
    }
  }

  const authorization = await getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = 401

  if (authorization) {
    headers = acceptCorsHeaders(true)
    const biketagOpts = getBikeTagClientOpts(
      {
        ...event,
        method: event.httpMethod,
      } as unknown as request.Request,
      true,
      true
    )

    const biketag = new BikeTagClient(biketagOpts)
    const credentials = await biketag.fetchCredentials(authorization)
    body = JSON.stringify(credentials)
    statusCode = 200
  } else {
    body = 'invalid authorization'
  }

  return {
    headers,
    body,
    statusCode,
  }
}

export { tokenHandler as handler }
