import BikeTagClient from 'biketag'
import {
  archiveAndClearQueue,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getImageSource,
  isRequestAllowed,
  log,
} from './common'
import { HttpStatusCode } from './common/constants'
import { BackgroundProcessResults } from './common/types'
// @ts-ignore
import { Game } from 'biketag/dist/common/schema'

export const autoClearQueue = async (req: Request): Promise<BackgroundProcessResults> => {
  if (!isRequestAllowed(req, true, true, false, 'post')) {
    return {
      results: ['unauthorized'],
      errors: true,
    }
  }

  let errors = false
  const queryStringParameters = new URL(req.url).searchParams
  const forceClear = queryStringParameters?.get('force') === 'true'
  const clearAll = queryStringParameters?.get('all') === 'true'
  let results: any = []
  const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const game = (await nonAdminBiketag.game(
    { game: nonAdminBiketagOpts.game },
    { source: 'sanity' },
  )) as Game

  nonAdminBiketag.config(
    {
      aws: {
        region: game.awsRegion,
      },
    },
    false,
    true,
  )
  const adminBiketagOpts = getBikeTagClientOpts(req, true, true, game)
  const adminBiketag = new BikeTagClient(adminBiketagOpts)
  const imageSource = getImageSource(game)
  const { data: mostRecentTag } = await adminBiketag.getTag(undefined, { source: imageSource })
  const twentyFourHoursAgo = new Date().getTime() - 60 * 60 * 24 * 1000

  if (twentyFourHoursAgo > mostRecentTag.mysteryTime * 1000 && !forceClear) {
    const errorMessage =
      'Most recent tag was created more than 24 hours ago. Please clear the queue manually.'
    log('cannot continue', errorMessage, 'error')
    return {
      results: [errorMessage],
      errors: true,
    }
  }

  if (clearAll) {
    const allTags = (
      await nonAdminBiketag.getQueue({ game: adminBiketagOpts.game }, { source: imageSource })
    ).data

    if (allTags.length) {
      log('all tags found', { game, allTags }, 'info')
      const archiveAndClearQueueResults = await archiveAndClearQueue(
        allTags,
        game,
        adminBiketag,
        undefined,
        true,
      )
      results = archiveAndClearQueueResults.results
      errors = archiveAndClearQueueResults.errors
    } else {
      const nothingToDoMessage = 'no tags found'
      log('nothing to do', nothingToDoMessage)
      results.push(nothingToDoMessage)
    }
  } else {
    const { queuedTags } = await getActiveQueueForGame(game, adminBiketag)

    if (queuedTags.length) {
      log('non-winning tag(s) found', { game, queuedTags })
      const archiveAndClearQueueResults = await archiveAndClearQueue(
        queuedTags,
        game,
        adminBiketag,
        undefined,
        forceClear,
      )
      results = archiveAndClearQueueResults.results
      errors = archiveAndClearQueueResults.errors
    } else {
      const nothingToDoMessage = 'no non-winning tags found'
      log('nothing to do', nothingToDoMessage)
      results.push(nothingToDoMessage)
    }
  }

  return {
    results,
    errors,
  }
}

export default async (req: Request) => {
  const { results, errors } = await autoClearQueue(req)

  if (results.length) {
    log('queue cleared', { results }, 'info')

    return new Response(JSON.stringify(results), {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  } else {
    log('queue not cleared', 'no results found', 'error')
    return new Response('', {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  }
}
