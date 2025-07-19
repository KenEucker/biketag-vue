import crypto from 'crypto'
import { SignJWT } from 'jose'
import { acceptCorsHeaders, getPayloadOpts, HttpStatusCode } from './common'

const getJwtSecretKey = () =>
  crypto
    .createHash('sha256')
    .update(process.env.HOST_KEY || '')
    .digest()

const stripFirstSubdomain = (host: string) => {
  const parts = host.split('.')
  return parts.length > 2 ? parts.slice(1).join('.') : host
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  const {
    p_id: playerId,
    client_id: clientId,
    client_assertion: clientAssertion,
    grant_type: grantType,
  } = await getPayloadOpts(req)

  const selfHostRaw = req.headers?.get('host') ?? ''
  const selfHost = stripFirstSubdomain(
    new URL(`http://${selfHostRaw}`).hostname
  )

  if (process.env.DEBUG_A === 'true') {
    console.log({
      playerId,
      clientId,
      clientAssertion,
      grantType,
      selfHostRaw,
      selfHost,
    })
  }

  // Updated strict check: normalize selfHost and clientId before comparison
  if (selfHost !== clientId) {
    console.log('[token] host mismatch', { clientId, selfHost })
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

  if (process.env.DEBUG_A === 'true') {
    console.log({
      assertionCorrect: clientAssertion === expectedAssertion,
      expectedAssertion,
    })
  }

  if (clientId && clientAssertion && grantType === 'biketag_origin_assertion') {
    if (clientAssertion === expectedAssertion) {
      try {
        const jwtKey = getJwtSecretKey()

        const jwt = await new SignJWT({ client_id: clientId, p_id: playerId })
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
