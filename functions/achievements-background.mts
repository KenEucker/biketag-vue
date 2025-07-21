import BikeTagClient, { Achievement, Game, Player, Tag } from 'biketag'
import { getSupportedGames } from '../src/common'
import { getBikeTagClientOpts, log } from './common'
import { HttpStatusCode } from './common/constants'
import { BackgroundProcessResults } from './common/types'

export const assignAchievements = async (): Promise<BackgroundProcessResults> => {
  if (process.env.SKIP_ACHIEVEMENTS_FUNCTION === "true") {
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
  const nonAdminBiketagOpts = getBikeTagClientOpts(undefined, true)
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
            log(`[${game.name}] does not have enough players to award achievements`, { playersCount: players.length }, 'warn')
          }
        }
      }
    }
  } else {
    log('couldnt get games', gamesResponse, 'error')
  }

  return {
    results,
    errors,
  }
}

export default async (req: Request) => {
  const { results, errors } = await assignAchievements()

  if (results.length) {
    log('achievements assigning attempted', { results }, 'info')
    return new Response(JSON.stringify(results), {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  } else {
    log('nothing to report')
    return new Response('', {
      status: errors ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
    })
  }
}