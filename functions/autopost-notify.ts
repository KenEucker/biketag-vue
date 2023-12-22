import { Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import { Game } from 'biketag/lib/common/schema'
import { HttpStatusCode } from './common/constants'
import {
  getBikeTagClientOpts,
  isRequestAllowed,
  sendNewBikeTagNotifications,
} from './common/methods'
import { BackgroundProcessResults } from './common/types'

export const autoNotifyNewBikeTagPosted = async (event): Promise<BackgroundProcessResults> => {
  if (!isRequestAllowed(event, true, true, false, 'post')) {
    return {
      results: ['unauthorized'],
      errors: true,
    }
  }

  const errors = false
  const forceNotify = event.queryStringParameters.force === 'true'
  let results: any = []
  const nonAdminBiketagOpts = getBikeTagClientOpts(event, true)
  const adminBiketagOpts = getBikeTagClientOpts(event, true, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const game = (await nonAdminBiketag.game(
    { game: nonAdminBiketagOpts.game },
    { source: 'sanity' },
  )) as Game

  const twoMostRecentTags = await nonAdminBiketag.getTags(
    { game: game.slug, limit: 2 },
    { source: 'imgur' },
  )
  console.log('twoMostRecentTags.data', twoMostRecentTags.data)
  if (twoMostRecentTags.data?.length !== 2) {
    const errorMessage = 'Could not retrieve two most recent tags.'
    console.log(errorMessage)
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  const [winningTag, previousTag] = twoMostRecentTags.data
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24 * 1000

  if (twentyFourHoursAgo > winningTag.mysteryTime * 1000 && !forceNotify) {
    const errorMessage = 'Most recent tag was created more than 24 hours ago.'
    console.log(errorMessage)
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  /// Set to admin credentials
  nonAdminBiketag.config(adminBiketagOpts)
  const notificationsSent = await sendNewBikeTagNotifications(
    game,
    previousTag,
    winningTag,
    nonAdminBiketag,
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

const autoPostNotifyHandler: Handler = async (event) => {
  const { results, errors } = await autoNotifyNewBikeTagPosted(event)

  if (results.length) {
    console.log('notifications sent', { results })
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: JSON.stringify(results),
    }
  } else {
    console.log('no notifications sent')
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: '',
    }
  }
}

const handler = autoPostNotifyHandler

export { handler }
