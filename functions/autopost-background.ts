import { Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'
import { HttpStatusCode } from './common/constants'
import {
  archiveAndClearQueue,
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getWinningTagForCurrentRound,
  setNewBikeTagPost,
} from './common/methods'
import { BackgroundProcessResults } from './common/types'

export const autoPostNewBikeTags = async (): Promise<BackgroundProcessResults> => {
  if (process.env.SKIP_AUTOPOST_FUNCTION) {
    return Promise.resolve({
      results: ['function skipped'],
      errors: false,
    })
  }

  const biketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
    true,
  )
  delete biketagOpts.game
  const nonAdminBiketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
  )
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const adminBiketag = new BikeTagClient(biketagOpts)
  const gamesResponse = await nonAdminBiketag.getGame(undefined, {
    source: 'sanity',
  })
  let results: any = []
  let errors = false

  if (gamesResponse.success) {
    const games = gamesResponse.data as unknown as Game[]

    for (const game of games) {
      const thisGameConfig = {
        game: game.slug,
        imgur: { hash: game.mainhash, queuehash: game.queuehash, archivehash: game.archivehash },
      }
      nonAdminBiketag.config(thisGameConfig)
      adminBiketag.config(thisGameConfig)
      const activeQueue = await getActiveQueueForGame(game)

      if (activeQueue.completedTags.length && activeQueue.timedOutTags.length) {
        const currentBikeTagResponse = await adminBiketag.getTag(undefined) // the "current" mystery tag to be updated from the main album
        const currentBikeTag = currentBikeTagResponse.data
        const autoSelectedWinningTag = getWinningTagForCurrentRound(
          activeQueue.timedOutTags,
          currentBikeTag,
        )

        if (autoSelectedWinningTag) {
          const setNewBikeTagPostResults = await setNewBikeTagPost(
            game,
            autoSelectedWinningTag,
            currentBikeTag,
          )

          const remainingNonWinningTags = activeQueue.queuedTags.filter(
            (t) => t.foundPlayer !== autoSelectedWinningTag.foundPlayer,
          )
          if (remainingNonWinningTags.length) {
            const archiveAndClearQueueResults = await archiveAndClearQueue(remainingNonWinningTags)
            results = setNewBikeTagPostResults.results.concat(archiveAndClearQueueResults.results)
            errors = archiveAndClearQueueResults.errors
          }
          results = setNewBikeTagPostResults.results.concat(setNewBikeTagPostResults.results)
          errors = errors || setNewBikeTagPostResults.errors
        }
      }
    }
  } else {
    console.log('couldnt get games', gamesResponse)
  }

  return {
    results,
    errors,
  }
}

const autoPostHandler: Handler = async () => {
  const { results, errors } = await autoPostNewBikeTags()
  console.log('autopost attempted', { results })
  if (results.length) {
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: JSON.stringify(results),
    }
  } else {
    console.log('nothing to report')
    return {
      statusCode: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
      body: '',
    }
  }
}

const handler = autoPostHandler

export { handler }
