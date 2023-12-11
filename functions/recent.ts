import { builder, Handler } from '@netlify/functions'
import { BikeTagClient } from 'biketag'
import { getTagsPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getPayloadOpts } from './common/methods'

const recentHandler: Handler = async (event) => {
  const response = {
    statusCode: 500,
    body: '',
  }
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
  )
  const biketag = new BikeTagClient(biketagOpts)
  if (!biketagOpts.game?.length) {
    const biketagAdminOpts = getBikeTagClientOpts(
      {
        ...event,
        method: event.httpMethod,
      } as unknown as request.Request,
      true,
      true,
    )
    const biketagAdmin = new BikeTagClient(biketagAdminOpts)
    // const featuredGameNames = await biketagAdmin
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
    const featuredGames = await biketag
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
        biketag.getTags(biketagPayload as getTagsPayload, {
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
    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    const biketagPayload = getPayloadOpts(event, {
      hash: game.mainhash,
      game: 'none',
      time: 'day',
    })
    const recentResponse = await biketag.getTags(biketagPayload as getTagsPayload, {
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
