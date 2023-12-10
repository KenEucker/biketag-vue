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
  const biketagOpts = getBikeTagClientOpts(event, true)
  const biketagAdminOpts = getBikeTagClientOpts(event, true, true)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game({ game: biketagOpts.game }, { source: 'sanity' })) as Game

  console.log('notifying for game', game)

  const twoMostRecentTags = await biketag.getTags(
    { game: biketagOpts.game, limit: 2 },
    { source: 'imgur' },
  )
  const [winningTag, previousTag] = twoMostRecentTags.data
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24

  if (twentyFourHoursAgo > winningTag.mysteryTime && !forceNotify) {
    return {
      results: ['Most recent tag was created more than 24 hours ago.'],
      errors: true,
    }
  }

  const notificationsSent = await sendNewBikeTagNotifications(
    game,
    previousTag,
    winningTag,
    new BikeTagClient(biketagAdminOpts),
  ).catch((err) => {
    console.log('error sending notifications', err)
  })

  if (notificationsSent?.length) {
    results = await Promise.allSettled(notificationsSent)
      .then((r) => r.map((p: any) => p.value))
      .catch((e) => {
        console.log({ e })
        return []
      })
    console.log({ results })
  }

  return {
    results,
    errors,
  }
}

const autoPostHandler: Handler = async (event) => {
  const { results, errors } = await autoNotifyNewBikeTagPosted(event)

  if (results.length) {
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

const handler = autoPostHandler

export { handler }
