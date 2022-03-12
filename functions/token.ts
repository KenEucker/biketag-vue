import { Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { HttpStatusCode } from './common/constants'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadAuthorization } from './common/methods'

const tokenHandler: Handler = async (event) => {
  /// Bailout on OPTIONS requests
  let headers = acceptCorsHeaders(false)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }

  const authorization = await getPayloadAuthorization(event)
  let body = 'missing authorization header'
  let statusCode = HttpStatusCode.Unauthorized

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
    statusCode = HttpStatusCode.Ok
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
