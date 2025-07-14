import BikeTagClient, { Game } from 'biketag'
import { BackgroundProcessResults, getBikeTagClientOpts, getPayloadOpts, isRequestAllowed, sendNewBikeTagNotifications } from './common'
import { HttpStatusCode } from './common/constants'

export const autoNotifyNewBikeTagPosted = async (req: Request): Promise<BackgroundProcessResults> => {
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
  const errors = false
  let results: any = []
  const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
  const adminBiketagOpts = getBikeTagClientOpts(req, true, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const game = (await nonAdminBiketag.game(
    { game: nonAdminBiketagOpts.game },
    { source: 'sanity' },
  )) as Game

  const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
  const twoMostRecentTags = await nonAdminBiketag.getTags(
    { game: game.slug, limit: 2 },
    { source: imageSource },
  )
  if (twoMostRecentTags.data?.length !== 2) {
    const errorMessage = 'Could not retrieve two most recent tags.'
    console.log(errorMessage, { twoMostRecentTags })
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  const [winningTag, previousTag] = twoMostRecentTags.data
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24 * 1000

  if (twentyFourHoursAgo > winningTag.mysteryTime * 1000 && !payloadOpts.force) {
    const errorMessage = 'Most recent tag was created more than 24 hours ago.'
    console.log(errorMessage)
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  /// Set to admin credentials
  await nonAdminBiketag.config(adminBiketagOpts, true, true)
  const notificationsSent = await sendNewBikeTagNotifications(
    game,
    previousTag,
    winningTag,
    nonAdminBiketag,
    payloadOpts.skipEmails,
    payloadOpts.skipSocials,
  ).catch((err) => {
    console.log('error sending notifications', err)
  })

  if (notificationsSent?.length) {
    results = await Promise.allSettled(notificationsSent)
      .then((r) => r.map((p: any) => p.value))
      .catch((e) => {
        console.log('error sending notifications', { e })
        return []
      })
  }

  return {
    results,
    errors,
  }
}

export default async (req: Request) => {
  const { results, errors } = await autoNotifyNewBikeTagPosted(req)

  if (results.length) {
    console.log('notifications sent', { results })
    return new Response(JSON.stringify(results), {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok
    })
  } else {
    console.log('no notifications sent')
    return new Response('', {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  }
}
