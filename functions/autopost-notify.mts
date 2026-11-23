import BikeTagClient, { Game } from 'biketag'
import {
  BackgroundProcessResults,
  NotificationDeliveryReport,
  getBikeTagClientOpts,
  getImageSource,
  getPayloadOpts,
  getProfileAuthorization,
  isRequestAllowed,
  log,
  requireGlobalAdmin,
  sendNewBikeTagNotifications,
} from './common'
import { HttpStatusCode } from './common/constants'

export const autoNotifyNewBikeTagPosted = async (
  req: Request,
): Promise<BackgroundProcessResults & { status?: HttpStatusCode }> => {
  if (!isRequestAllowed(req, true, true, false, 'post')) {
    return {
      results: ['unauthorized'],
      errors: true,
    }
  }

  const payloadOpts = await getPayloadOpts(req, {
    skipEmails: false,
    force: false,
  })
  if (payloadOpts.force) {
    const profile = await getProfileAuthorization(req)
    if (!requireGlobalAdmin(profile)) {
      return {
        results: ['unauthorized'],
        errors: true,
        status: HttpStatusCode.Unauthorized,
      }
    }

    const allowedTargets = [
      'game-email',
      'game-discord',
      'game-slack',
      'global-discord',
      'global-slack',
      'global-bluesky',
    ]
    if (
      !Array.isArray(payloadOpts.notificationTargets) ||
      !payloadOpts.notificationTargets.length ||
      !payloadOpts.notificationTargets.every((target: string) => allowedTargets.includes(target))
    ) {
      return {
        results: ['select one or more valid notification destinations'],
        errors: true,
        status: HttpStatusCode.BadRequest,
      }
    }
  }
  let errors = false
  let results: any = []
  const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
  const adminBiketagOpts = getBikeTagClientOpts(req, true, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const game = (await nonAdminBiketag.game(
    { game: nonAdminBiketagOpts.game },
    { source: 'sanity' },
  )) as Game

  const imageSource = getImageSource(game)
  nonAdminBiketag.config(
    {
      aws: {
        region: game.awsRegion,
      },
    },
    false,
    true,
  )
  adminBiketagOpts.aws.region = game.awsRegion
  const twoMostRecentTags = await nonAdminBiketag.getTags(
    { game: game.slug, limit: 2 },
    { source: imageSource },
  )
  if (!twoMostRecentTags.success || !twoMostRecentTags.data?.length) {
    const errorMessage = 'Could not retrieve the latest tag.'
    log(errorMessage, { twoMostRecentTags }, 'error')
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  const [winningTag, previousTag] = twoMostRecentTags.data
  if (!previousTag && winningTag.tagnumber !== 1) {
    return { results: ['Could not retrieve the previous tag.'], errors: true }
  }
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24 * 1000

  if (twentyFourHoursAgo > winningTag.mysteryTime * 1000 && !payloadOpts.force) {
    const errorMessage = 'Most recent tag was created more than 24 hours ago.'
    log('cannot continue', errorMessage, 'error')
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  /// Set to admin credentials
  await nonAdminBiketag.config(adminBiketagOpts, true, true)
  const deliveryReport: NotificationDeliveryReport[] = []
  const notificationsSent = await sendNewBikeTagNotifications(
    game,
    previousTag,
    winningTag,
    nonAdminBiketag,
    payloadOpts.skipEmails,
    payloadOpts.skipSocials,
    payloadOpts.notificationTargets,
    payloadOpts.force ? deliveryReport : undefined,
  ).catch((err) => {
    errors = true
    results.push({ error: err instanceof Error ? err.message : String(err) })
    log('error sending notifications', err, 'error')
  })

  if (notificationsSent?.length) {
    const settled = await Promise.allSettled(notificationsSent)
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        if (!payloadOpts.force) results.push(result.value)
      } else {
        errors = true
        if (!payloadOpts.force) {
          results.push({
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          })
        }
        log('error sending notification', result.reason, 'error')
      }
    }
  }

  if (payloadOpts.force) {
    if (deliveryReport.some((report) => report.status === 'failed')) {
      errors = true
    }
    results.push(...deliveryReport)
  }

  return {
    results,
    errors,
  }
}

export default async (req: Request) => {
  const { results, errors, status } = await autoNotifyNewBikeTagPosted(req)

  if (results.length) {
    log('notification delivery completed', { results, errors }, errors ? 'error' : 'info')
    return new Response(JSON.stringify(results), {
      status: status ?? (errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok),
    })
  } else {
    log('no notifications sent', 'info')
    return new Response('', {
      status: status ?? (errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok),
    })
  }
}
