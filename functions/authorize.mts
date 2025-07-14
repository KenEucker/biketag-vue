import crypto from 'crypto'
import { SignJWT } from 'jose'
import { acceptCorsHeaders, getPayloadOpts, HttpStatusCode } from './common'

// Utility: create consistent key for JWT signing
const getJwtSecretKey = () =>
  crypto
    .createHash('sha256')
    .update(process.env.HOST_KEY || '')
    .digest()

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    /// TODO: check request host
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  const {
    client_id: clientId,
    client_assertion: clientAssertion,
    grant_type: grantType,
  } = await getPayloadOpts(req)

  const selfHost = new URL(`http://${req.headers?.get('host')}`).hostname

  // Additional strict check: ensure that `Host` header matches `client_id`
  if (selfHost !== clientId) {
    console.log('[token] host mismatch', {clientId, selfHost})
    return new Response('Host mismatch', {
      headers,
      status: HttpStatusCode.Unauthorized,
    })
  }

  const expectedAssertion = crypto
    .createHash('sha256')
    .update(`${clientId}${process.env.HOST_KEY || ''}`)
    .digest('hex')

  let status = HttpStatusCode.Unauthorized
  let body = 'Missing or invalid payload'

  if (clientId && clientAssertion && grantType === 'biketag_origin_assertion') {
    if (clientAssertion === expectedAssertion) {
      try {
        const jwtKey = getJwtSecretKey()

        const jwt = await new SignJWT({ client_id: clientId })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('3h')
          .sign(jwtKey)

        status = HttpStatusCode.Ok
        body = jwt
      } catch (err) {
        status = HttpStatusCode.InternalServerError
        body = 'Error generating token'
      }
    } else {
      body = 'Invalid client assertion'
    }
  } else {
    body = 'Invalid request payload or grant_type'
  }

  return new Response(body, {
    headers,
    status,
  })
}
