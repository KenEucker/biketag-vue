import BikeTagClient, { Game } from 'biketag'
import {
  getActiveQueueForGame,
  getBikeTagClientOpts,
  getWinningTagForCurrentRound,
  setNewBikeTagPost,
} from './common'
import { HttpStatusCode } from './common/constants'
import { BackgroundProcessResults } from './common/types'

export const autoPostNewBikeTags = async (): Promise<BackgroundProcessResults> => {
  if (process.env.SKIP_AUTOPOST_FUNCTION === "true") {
    return Promise.resolve({
      results: ['function skipped'],
      errors: false,
    })
  }

  // if (!isRequestAllowed()) {}
  console.log('Running autoPostNewBikeTags')

  const adminBiketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as Request,
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
      const autoPostSetting =
        game.settings && !!game.settings['queue::autoPost']
          ? parseInt(game.settings['queue::autoPost'])
          : 0

      if (autoPostSetting === 0) {
        console.log('autopost not set, skipping game', game.name)
        continue
      } else {
        console.log(`autopost set to ${autoPostSetting} minutes, checking game`, game.name)
      }

      const thisGameConfig = {
        biketag: {
          game: game.slug,
        },
        aws: { region: game.awsRegion },
        imgur: { hash: game.mainhash, queuehash: game.queuehash, archivehash: game.archivehash },
      }

      nonAdminBiketag.config(thisGameConfig, false, true)
      adminBiketag.config(thisGameConfig, false, true)
      const imageSource = game.awsRegion ? 'aws' : 'imgur'
      const activeQueue = await getActiveQueueForGame(game, nonAdminBiketag)

      if (activeQueue.completedTags.length && activeQueue.timedOutTags.length === 0) {
        console.log('completed tags found but none timed out', { game, activeQueue })
      } else if (activeQueue.completedTags.length && activeQueue.timedOutTags.length) {
        const currentBikeTagResponse = await adminBiketag.getTag(undefined, { source: imageSource }) // the "current" mystery tag to be updated from the main album
        if (!currentBikeTagResponse.success) {
          results = results.concat([
            'queue for game ' + game.name + ' has completed tags in it',
            'but, for some reason, the current biketag was not returned: ' +
              currentBikeTagResponse.status +
              '->' +
              (currentBikeTagResponse.error ?? currentBikeTagResponse.data),
            'has imgur rate-limited us? Not using RapidAPI?',
          ])
          errors = true
        } else {
          const currentBikeTag = currentBikeTagResponse.data
          const autoSelectedWinningTag = getWinningTagForCurrentRound(
            activeQueue.timedOutTags,
            currentBikeTag,
          )

          if (autoSelectedWinningTag) {
            console.log('winning tag found, setting new BikeTag post', {
              game: game.slug,
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
    }
  } else {
    console.log('couldnt get games', gamesResponse)
  }

  return {
    results,
    errors,
  }
}

export default async () => {
  const { results, errors } = await autoPostNewBikeTags()

  if (results.length) {
    console.log('autopost attempted', { results })
    
    return new Response(JSON.stringify(results), {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  } else {
    console.log('nothing to report')
    return new Response('', {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  }
}
