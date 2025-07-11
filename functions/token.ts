import { Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import request from 'request'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadAuthorization } from './common'
import { HttpStatusCode } from './common/constants'

const tokenHandler: Handler = async (event) => {
  const headers = acceptCorsHeaders()

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: HttpStatusCode.NoContent,
      headers,
    }
  }

  const authorization = await getPayloadAuthorization(event)

  let statusCode = HttpStatusCode.Unauthorized
  let body: string | object = 'missing authorization header'

  if (authorization) {
    const adminBiketagOpts = getBikeTagClientOpts(
      {
        ...event,
        method: event.httpMethod,
      } as unknown as request.Request,
      true,
      true,
    )

    const adminBiketag = new BikeTagClient(adminBiketagOpts)

    try {
      const parsed = JSON.parse(event.body || '{}')

      if (typeof parsed?.key === 'string') {
        // Signed URL request
        const signedUrlResponse = await adminBiketag.fetchSignedUrl({
          ...parsed,
          source: 'aws',
        })

        statusCode = HttpStatusCode.Ok
        body = signedUrlResponse
      } else {
        // Fallback to legacy: return all credentials
        const credentials = await adminBiketag.fetchCredentials(authorization)
        statusCode = HttpStatusCode.Ok
        body = credentials
      }
    } catch (err: any) {
      statusCode = HttpStatusCode.InternalServerError
      body = err.message || 'Unexpected error'
    }
  }

  return {
    headers,
    statusCode,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }
}

export { tokenHandler as handler }
