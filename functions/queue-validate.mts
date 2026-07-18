import {
  acceptCorsHeaders,
  getPayloadOpts,
  HttpStatusCode,
  log,
  validateQueueSubmissionPayload,
  validateQueueUpload,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'request method not allowed' }), {
      status: HttpStatusCode.MethodNotAllowed,
      headers,
    })
  }

  try {
    const payload = await getPayloadOpts(req)
    const result = payload.payload
      ? await validateQueueSubmissionPayload(req, payload.payload)
      : await validateQueueUpload({
          req,
          gameName: payload.game,
          tag: payload.tag ?? payload,
          imageType: payload.imageType ?? payload.type,
          imageUrl: payload.imageUrl,
        })

    return new Response(JSON.stringify(result), {
      status: result.success ? HttpStatusCode.Ok : HttpStatusCode.BadRequest,
      headers,
    })
  } catch (err: any) {
    log('[queue-validate] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
