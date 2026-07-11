import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadAuthorization,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'
import { playerMatchesAuthorization } from './common/screening/auth'
import {
  getStorageKeyFromUrl,
  processQueueImageScreening,
  resolveCurrentRound,
} from './common/screening'
import { ErrorMessage } from './common/constants'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[screen-background] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'POST') {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatusCode.MethodNotAllowed,
      headers,
    })
  }

  try {
    const authorization = await getPayloadAuthorization(req)
    const payload = await getPayloadOpts(req)
    const playerId = payload.playerId ?? authorization.profile?.p_id ?? authorization.profile?.sub
    const imageUrl = payload.imageUrl as string
    const imageType = payload.imageType as 'found' | 'mystery'
    const playerIp = payload.playerIP ?? payload.playerIp ?? payload.ip ?? ''
    const imageKey = getStorageKeyFromUrl(imageUrl)
    const currentRound = resolveCurrentRound(payload, imageKey, imageType)

    if (!playerMatchesAuthorization(authorization, playerId)) {
      log('[screen-background] Unauthorized', { playerId, authType: authorization.type }, 'warn')
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: HttpStatusCode.Unauthorized,
        headers,
      })
    }

    if (!imageUrl?.length || (imageType !== 'found' && imageType !== 'mystery')) {
      return new Response(JSON.stringify({ error: 'imageUrl and imageType are required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (!imageKey.startsWith('queue/')) {
      return new Response(JSON.stringify({ error: 'image must be a queue upload' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    if (currentRound === undefined) {
      return new Response(JSON.stringify({ error: 'currentRound is required' }), {
        status: HttpStatusCode.BadRequest,
        headers,
      })
    }

    const biketagOpts = getBikeTagClientOpts(req, true)
    const biketag = new BikeTagClient(biketagOpts)
    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    await processQueueImageScreening({
      game,
      biketag,
      imageUrl,
      imageKey,
      imageType,
      playerId,
      playerIp,
      currentRound,
    })
  } catch (error: any) {
    log('[screen-background] Unexpected error — fail-open', error, 'error')
  }

  return new Response('', { status: HttpStatusCode.Ok, headers })
}
