import { builder, Handler } from '@netlify/functions'
import {
  getBikeTagClientOpts,
  getActiveQueueForGame,
  getWinningTagForCurrentRound,
  setNewBikeTagPost,
  archiveAndClearQueue,
  sendEmail,
} from './common/methods'
import request from 'request'
import { BackgroundProcessResults } from './common/types'
import BikeTagClient from 'biketag'
import { Game } from 'biketag/lib/common/schema'

export const autoPostNewBikeTags = async (biketagOpts: any): Promise<BackgroundProcessResults> => {
  biketagOpts =
    biketagOpts ?? getBikeTagClientOpts({ method: 'get' } as unknown as request.Request, true, true)
  delete biketagOpts.game
  const biketag = new BikeTagClient(biketagOpts)
  const gamesResponse = await biketag.getGame(undefined, {
    source: 'sanity',
  })
  let results = []
  let errors = false

  if (gamesResponse.success) {
    const games = gamesResponse.data as unknown as Game[]
    const mainBikeTagOpts = getBikeTagClientOpts(
      { method: 'get' } as unknown as request.Request,
      true
    )
    const mainBikeTag = new BikeTagClient(mainBikeTagOpts)

    for (const game of games) {
      mainBikeTag.config({ game: game.name.toLowerCase(), imgur: { hash: game.mainhash } })
      const activeQueue = await getActiveQueueForGame(game)

      if (activeQueue.completedTags.length && activeQueue.timedOutTags.length) {
        const currentBikeTagResponse = await mainBikeTag.getTag(undefined) // the "current" mystery tag to be updated from the main album
        const currentBikeTag = currentBikeTagResponse.data
        const autoSelectedWinningTag = getWinningTagForCurrentRound(
          activeQueue.timedOutTags,
          currentBikeTag
        )
        console.log({ currentBikeTag, autoSelectedWinningTag })

        if (autoSelectedWinningTag) {
          const setNewBikeTagPostResults = await setNewBikeTagPost(
            autoSelectedWinningTag,
            game,
            currentBikeTag
          )
          const archiveAndClearQueueResults = await archiveAndClearQueue(activeQueue.queuedTags)
          results = setNewBikeTagPostResults.results.concat(
            setNewBikeTagPostResults.results,
            archiveAndClearQueueResults.results
          )
          errors = setNewBikeTagPostResults.errors && archiveAndClearQueueResults.errors
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

const autoPost: Handler = async (event) => {
  const adminBiketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
    true
  )
  const { results, errors } = await autoPostNewBikeTags(adminBiketagOpts)
  await sendEmail('keneucker@gmail.com', 'autoPostEmail test', { results, errors }, 'test')

  if (results.length) {
    console.log({ results })
    return {
      statusCode: errors ? 400 : 200,
      body: JSON.stringify(results),
    }
  } else {
    console.log('nothing to report')
    return {
      statusCode: errors ? 400 : 200,
      body: '',
    }
  }
}

const handler = builder(autoPost)

export { handler }
