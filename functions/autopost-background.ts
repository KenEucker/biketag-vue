import { Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'
import { HttpStatusCode } from './common/constants'
import {
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

  // if (!isRequestAllowed()) {}

  const adminBiketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
    true,
  )
  delete adminBiketagOpts.game
  /// Cache what we can here, so that it improves this method's performance
  // biketagOpts.cached = true
  const nonAdminBiketagOpts = getBikeTagClientOpts(undefined, true)
  delete nonAdminBiketagOpts.game
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  const adminBiketag = new BikeTagClient(adminBiketagOpts)
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
      const activeQueue = await getActiveQueueForGame(game, adminBiketag)

      if (activeQueue.completedTags.length && activeQueue.timedOutTags.length === 0) {
        console.log('completed tags found but none timed out', { game, activeQueue })
      } else if (activeQueue.completedTags.length && activeQueue.timedOutTags.length) {
        const currentBikeTagResponse = await adminBiketag.getTag(undefined) // the "current" mystery tag to be updated from the main album
        const currentBikeTag = currentBikeTagResponse.data
        const autoSelectedWinningTag = getWinningTagForCurrentRound(
          activeQueue.timedOutTags,
          currentBikeTag,
        )

        if (autoSelectedWinningTag) {
          console.log('winning tag found, setting new BikeTag post', {
            game,
            autoSelectedWinningTag,
          })
          const setNewBikeTagPostResults = await setNewBikeTagPost(
            game,
            autoSelectedWinningTag,
            currentBikeTag,
            adminBiketag,
            nonAdminBiketag,
          )
          results = results.concat(setNewBikeTagPostResults.results)
          errors = setNewBikeTagPostResults.errors
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

  if (results.length) {
    console.log('autopost attempted', { results })
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
