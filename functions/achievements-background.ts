import { Handler } from '@netlify/functions'
import BikeTagClient from 'biketag'
import { Achievement, Game, Player, Tag } from 'biketag/lib/common/schema'
import request from 'request'
import { getSupportedGames } from '../src/common/utils'
import { HttpStatusCode } from './common/constants'
import { getBikeTagClientOpts } from './common/methods'
import { BackgroundProcessResults } from './common/types'

export const assignAchievements = async (): Promise<BackgroundProcessResults> => {
  if (process.env.SKIP_AUTOPOST_FUNCTION) {
    return Promise.resolve({
      results: ['function skipped'],
      errors: false,
    })
  }

  // if (!isRequestAllowed()) {}

  // const adminBiketagOpts = getBikeTagClientOpts(
  //   { method: 'get' } as unknown as request.Request,
  //   true,
  //   true,
  // )
  // delete adminBiketagOpts.game
  /// Cache what we can here, so that it improves this method's performance
  // biketagOpts.cached = true
  const nonAdminBiketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
  )
  delete nonAdminBiketagOpts.game
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  // const adminBiketag = new BikeTagClient(adminBiketagOpts)
  const gamesResponse = await nonAdminBiketag.getGame(undefined, {
    source: 'sanity',
  })
  const results: any = []
  const errors = false

  if (gamesResponse.success) {
    const games = getSupportedGames(gamesResponse.data as unknown as Game[])

    for (const game of games) {
      const thisGameConfig = {
        game: game.slug,
        imgur: { hash: game.mainhash, queuehash: game.queuehash, archivehash: game.archivehash },
      }
      nonAdminBiketag.config(thisGameConfig, false, true)
      // adminBiketag.config(thisGameConfig, false, true)
      const tags = (await nonAdminBiketag.tags()) as Tag[]
      // const players = (await nonAdminBiketag.players(undefined, { source: 'sanity' })) as Player[]

      if (tags.length > 100) {
        // console.log('game is ready for achievements', game.name)
        /// If the game has achievements, it is enabled
        const achievements = (await nonAdminBiketag.achievements()) as Achievement[]

        if (achievements?.length) {
          // console.log({ achievements }, game.name)
          /// Get a list of BikeTag Players who have logged in
          const players = (await nonAdminBiketag.players(undefined, {
            source: 'sanity',
          })) as Player[]

          if (players.length > 20) {
            /// Only award achievements if at least 20 players have logged in
          } else {
            console.log(`[${game.name}] does not have enough players to award achievements`)
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

const assignAchievementsHandler: Handler = async () => {
  const { results, errors } = await assignAchievements()

  if (results.length) {
    console.log('achievements assigning attempted', { results })
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

const handler = assignAchievementsHandler

export { handler }
