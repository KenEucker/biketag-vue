import { BikeTagClient, Game } from 'biketag'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadAuthorization } from './common'
import { HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  console.log('token request')
  const headers = acceptCorsHeaders()

  if (req.method === 'OPTIONS') {
     return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  const authProfile = await getPayloadAuthorization(req)
  let status = HttpStatusCode.Unauthorized
  let body: string = 'Missing or invalid authorization'

  if (authProfile && authProfile.valid && authProfile.token) {
    const decodedPayload = authProfile.valid // this is your `{ client_id }` payload
    const clientId = decodedPayload.client_id

    const adminBiketagOpts = getBikeTagClientOpts(
      req,
      true,
      true,
    )
    
    const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)

    const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)

    try {
      const gameResponse = await nonAdminBiketag.getGame(adminBiketagOpts.game, { source: 'sanity' })
      adminBiketagOpts.aws.region = gameResponse.data?.awsRegion
      const adminBiketag = new BikeTagClient(adminBiketagOpts)

      const payload = new URLSearchParams(decodeURIComponent(await req.text() ?? ''))
      const key = payload.get('key')
      const game = payload.get('game')
      const contentType = payload.get('contentType')

      if (key && game && contentType) {
        const contentKeyMatch = `queue/${adminBiketagOpts.game}-tag`
        if (!key.startsWith(contentKeyMatch)) {
          console.warn('[token] Key prefix mismatch', { key, contentKeyMatch })
          throw new Error('Invalid key prefix')
        }

        const signedUrlResponse = await adminBiketag.fetchSignedUrl(
          {
            key,
            bucket: `${game}-biketag`,
            contentType,
            game,
          },
          {
            source: 'aws',
          },
        )

        if (signedUrlResponse.success) {
          status = HttpStatusCode.Ok
          body = signedUrlResponse.data
        } else {
          body = signedUrlResponse.error
          status = signedUrlResponse.status
        }
      } else {
        status = 400
        body = 'Missing or invalid key combination'
      }
    } catch (err: any) {
      console.error('[token] Unexpected error', err)
      status = HttpStatusCode.InternalServerError
      body = err.message || 'Unexpected error'
    }
  } else {
    console.warn('[token] Unauthorized request', { authProfile })
  }
  
  return new Response(body, {
    headers,
    status,
  })
}

