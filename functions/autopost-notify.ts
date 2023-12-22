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
  const adminBiketagOpts = getBikeTagClientOpts(event, true, true)
  const adminBiketag = new BikeTagClient(adminBiketagOpts)
  const game = (await adminBiketag.game(undefined, { source: 'sanity' })) as Game

  const twoMostRecentTags = await adminBiketag.getTags({ limit: 2 }, { source: 'imgur' })
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

  const notificationsSent = await sendNewBikeTagNotifications(
    game,
    previousTag,
    winningTag,
    adminBiketag,
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
