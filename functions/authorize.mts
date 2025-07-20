import crypto from 'crypto'
import { SignJWT } from 'jose'
import { acceptCorsHeaders, getPayloadOpts, HttpStatusCode, log } from './common'

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

  log('[token] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[token] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  try {
    const {
      p_id: playerId,
      client_id: clientId,
      client_assertion: clientAssertion,
      grant_type: grantType,
    } = await getPayloadOpts(req)

    const selfHostRaw = req.headers?.get('host') ?? ''
    const selfHost = stripFirstSubdomain(new URL(`http://${selfHostRaw}`).hostname)

    log('[token] Parsed payload', {
      playerId,
      clientId,
      grantType,
      selfHostRaw,
      selfHost,
    })

    if (selfHost !== clientId) {
      log('[token] Host mismatch', { selfHost, clientId }, 'warn')
      return new Response('Host mismatch', {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const expectedAssertion = crypto
      .createHash('sha256')
      .update(`${clientId}${process.env.HOST_KEY || ''}`)
      .digest('hex')

    log('[token] Assertion check', {
      assertionMatch: clientAssertion === expectedAssertion,
    })

    if (clientId && clientAssertion && grantType === 'biketag_origin_assertion') {
      if (clientAssertion === expectedAssertion) {
        log('[token] Valid client assertion', { clientId })

        try {
          const jwtKey = getJwtSecretKey()

          const jwt = await new SignJWT({ client_id: clientId, p_id: playerId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('3h')
            .sign(jwtKey)

          log('[token] JWT issued', { clientId, playerId })

          return new Response(jwt, {
            headers,
            status: HttpStatusCode.Ok,
          })
        } catch (err) {
          log('[token] Error generating JWT', err, 'error')
          return new Response('Error generating token', {
            headers,
            status: HttpStatusCode.InternalServerError,
          })
        }
      } else {
        log('[token] Invalid client assertion', { clientId }, 'warn')
        return new Response('Invalid client assertion', {
          headers,
          status: HttpStatusCode.Unauthorized,
        })
      }
    } else {
      log('[token] Invalid request payload or grant_type', { clientId, grantType }, 'warn')
      return new Response('Invalid request payload or grant_type', {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }
  } catch (err) {
    log('[token] Unexpected error', err, 'error')
    return new Response('Internal server error', {
      headers,
      status: HttpStatusCode.InternalServerError,
    })
  }
}
