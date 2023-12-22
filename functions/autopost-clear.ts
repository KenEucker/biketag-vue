import { Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import { Game } from 'biketag/lib/common/schema'
import { HttpStatusCode } from './common/constants'
import {
  archiveAndClearQueue,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  isRequestAllowed,
} from './common/methods'
import { BackgroundProcessResults } from './common/types'

export const autoClearQueue = async (event): Promise<BackgroundProcessResults> => {
  if (!isRequestAllowed(event, true, true, false, 'post')) {
    return {
      results: ['unauthorized'],
      errors: true,
    }
  }

  let errors = false
  const forceNotify = event.queryStringParameters.force === 'true'
  let results: any = []
  const nonAdminBiketagOpts = getBikeTagClientOpts(event, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const game = (await nonAdminBiketag.game(
    { game: nonAdminBiketagOpts.game },
    { source: 'sanity' },
  )) as Game

  const adminBiketagOpts = getBikeTagClientOpts(event, true, true, game)
  const adminBiketag = new BikeTagClient(adminBiketagOpts)
  const { data: mostRecentTag } = await adminBiketag.getTag(undefined, { source: 'imgur' })
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24 * 1000

  console.log({ mostRecentTag })
  if (twentyFourHoursAgo > mostRecentTag.mysteryTime * 1000 && !forceNotify) {
    const errorMessage =
      'Most recent tag was created more than 24 hours ago. Please clear the queue manually.'
    console.log(errorMessage)
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  const { queuedTags } = await getActiveQueueForGame(game, adminBiketag)

  if (queuedTags.length) {
    console.log('non-winning tag(s) found', { game, queuedTags })
    const archiveAndClearQueueResults = await archiveAndClearQueue(queuedTags)
    results = archiveAndClearQueueResults.results
    errors = archiveAndClearQueueResults.errors
  } else {
    const nothingToDoMessage = 'no non-winning tags found'
    console.log(nothingToDoMessage)
    results.push(nothingToDoMessage)
  }

  return {
    results,
    errors,
  }
}

const autoPostClearHandler: Handler = async (event) => {
  const { results, errors } = await autoClearQueue(event)

  if (results.length) {
    console.log('queue cleared', { results })
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: JSON.stringify(results),
    }
  } else {
    console.log('queue not cleared')
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: '',
    }
  }
}

const handler = autoPostClearHandler

export { handler }
