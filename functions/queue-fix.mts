import { BikeTagClient, Game, Tag } from 'biketag'
import {
  acceptCorsHeaders,
  coerceBooleanQueryParam,
  getBikeTagClientOpts,
  getImageSource,
  getMainFolderUpdateOpts,
  getMainImageUrlIssues,
  getPayloadOpts,
  getProfileAuthorization,
  getQueueApiHost,
  getQueueImageUrlIssues,
  log,
  requireGlobalAdmin,
} from './common'
import { HttpStatusCode } from './common/constants'

const configureAwsClient = (biketag: BikeTagClient, game: Game, imageSource: string) => {
  if (imageSource === 'aws') {
    biketag.config(
      {
        biketag: { host: process.env.HOST },
        aws: { region: game.awsRegion },
      },
      false,
      true,
    )
  }
}

const fixMainFolderImages = async (
  adminBiketag: BikeTagClient,
  game: Game,
  imageSource: string,
  currentTag?: Tag,
) => {
  if (imageSource !== 'aws' || !currentTag) {
    return { fixed: false, issues: getMainImageUrlIssues(currentTag ?? []) }
  }

  const issues = getMainImageUrlIssues(currentTag)
  if (!issues.length) {
    return { fixed: false, issues }
  }

  const mainUpdateOpts = getMainFolderUpdateOpts(game, imageSource)
  const updateResult = await adminBiketag.updateTag({ ...currentTag, ...mainUpdateOpts }, mainUpdateOpts)

  const refreshedTag = updateResult.success ? updateResult.data : currentTag
  return {
    fixed: updateResult.success,
    issues: getMainImageUrlIssues(refreshedTag ?? currentTag),
    error: updateResult.success ? undefined : updateResult.error,
  }
}

const collectImageIssues = (queue: Tag[], currentTag?: Tag) => {
  return [...getQueueImageUrlIssues(queue), ...getMainImageUrlIssues(currentTag ?? [])]
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[queue-fix] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)

    if (!requireGlobalAdmin(profile)) {
      log('[queue-fix] Unauthorized attempt', { email: profile?.email ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const biketagOpts = getBikeTagClientOpts(req, true, true)
    const adminBiketag = new BikeTagClient(biketagOpts)

    const game = (await adminBiketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game

    if (!game) {
      return new Response(JSON.stringify({ error: 'game not found' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const imageSource = getImageSource(game)
    configureAwsClient(adminBiketag, game, imageSource)

    const payloadOpts = await getPayloadOpts(req, {
      game: biketagOpts.game,
      host: getQueueApiHost(biketagOpts.game),
      region: game.awsRegion,
      cached: false,
    })

    const shouldFix = req.method === 'POST' || coerceBooleanQueryParam(payloadOpts.fix) === true
    const queueHost = getQueueApiHost(biketagOpts.game)

    log('[queue-fix] Running queue scan', { shouldFix, game: game.name })

    const queueResponse = await adminBiketag.getQueue(
      {
        game: biketagOpts.game,
        host: queueHost,
        region: game.awsRegion,
        cached: false,
        reindex: true,
        resize: shouldFix,
      },
      { source: imageSource },
    )

    if (!queueResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: queueResponse.error ?? 'failed to load queue',
        }),
        {
          headers,
          status: queueResponse.status ?? HttpStatusCode.BadRequest,
        },
      )
    }

    const queue = queueResponse.data ?? []
    const currentTagResponse = await adminBiketag.getTag(undefined, { source: imageSource })
    const currentTag = currentTagResponse.success ? currentTagResponse.data : undefined

    let mainFixResult = {
      fixed: false,
      error: undefined as string | undefined,
    }

    if (shouldFix) {
      mainFixResult = await fixMainFolderImages(adminBiketag, game, imageSource, currentTag)
    }

    const issues = collectImageIssues(queue, currentTag)
    const responsePayload = {
      success: true,
      fixed: shouldFix,
      queueReindexed: true,
      queueResized: shouldFix,
      mainFixed: mainFixResult.fixed,
      issueCount: issues.length,
      issues,
      queue,
      error: mainFixResult.error,
    }

    log('[queue-fix] Completed', {
      fixed: shouldFix,
      issueCount: issues.length,
      queueCount: queue.length,
      mainFixed: mainFixResult.fixed,
    })

    return new Response(JSON.stringify(responsePayload), {
      headers,
      status: HttpStatusCode.Ok,
    })
  } catch (err: any) {
    log('[queue-fix] Unexpected error', err, 'error')
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message ?? 'Unknown error',
      }),
      {
        status: HttpStatusCode.InternalServerError,
        headers,
      },
    )
  }
}
