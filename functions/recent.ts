import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/dist/common/payloads'
import { Game } from 'biketag/dist/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const recentHandler: Handler = async (event) => {
  const response = {
    statusCode: 500,
    body: '',
  }
  const nonAdminBiketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
  )
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  if (!nonAdminBiketagOpts.game?.length) {
    // const adminBiketagOpts = getBikeTagClientOpts(
    //   {
    //     ...event,
    //     method: event.httpMethod,
    //   } as unknown as request.Request,
    //   true,
    //   true,
    // )
    // const adminBiketag = new BikeTagClient(adminBiketagOpts)
    // const featuredGameNames = await adminBiketag
    //   .getGame(
    //     { game: '', cached: false },
    //     {
    //       source: 'sanity',
    //       cached: false,
    //     },
    //   )
    //   .then((d) => {
    //     if (d.success) {
    //       const adminGames = d.data as unknown as Game[]
    //       const featuredGamesList = adminGames.filter(
    //         (g: Game) => g.settings['game::featured'] === 'true',
    //       )
    //       return featuredGamesList.map((g: Game) => g.name)
    //     }
    //     return []
    //   })
    const featuredGames = await nonAdminBiketag
      .getGame(
        { game: '', cached: false },
        {
          source: 'sanity',
        },
      )
      .then((d) => {
        if (d.success) {
          const nonAdminGames = d.data as unknown as Game[]
          const supportedGames = nonAdminGames.filter((g: Game) => {
            return (
              // featuredGameNames.indexOf(g.name) !== -1 &&
              g.mainhash?.length && g.archivehash?.length && g.queuehash?.length && g.logo?.length
            )
          })
          return supportedGames
        }
        return []
      })
    const recentResponses: any = []
    for (let i = 0; i < featuredGames.length; i++) {
      const game = featuredGames[i]
      const biketagPayload = getPayloadOpts(event, {
        hash: game.mainhash,
        game: 'none',
        time: 'day',
        cached: true,
      })
      recentResponses.push(
        nonAdminBiketag.getTags(biketagPayload as getTagsPayload, {
          source: 'imgur',
          cached: true,
        }),
      )
    }
    const recentTags = (await Promise.allSettled(recentResponses))
      .filter((r) => r.status === 'fulfilled' && r.value?.length)
      .map((d: any) => d.value)

    response.statusCode = 200
    response.body = JSON.stringify(recentTags)
  } else {
    const game = (await nonAdminBiketag.game(nonAdminBiketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    const biketagPayload = getPayloadOpts(event, {
      hash: game.mainhash,
      game: 'none',
      time: 'day',
    })
    const recentResponse = await nonAdminBiketag.getTags(biketagPayload as getTagsPayload, {
      source: 'imgur',
    })
    if (recentResponse.success) {
      response.statusCode = recentResponse.status
      response.body = JSON.stringify(recentResponse.success ? recentResponse.data : recentResponse)
    }
  }
  return response
}

const handler = builder(recentHandler)

export { handler }
