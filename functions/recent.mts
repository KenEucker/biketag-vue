import { BikeTagClient, Game } from 'biketag'
import { acceptCorsHeaders, getBikeTagClientOpts, getPayloadOpts, HttpStatusCode } from './common'
// @ts-ignore
import { getTagsPayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()
  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    /// TODO: check request host
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }
  const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
  const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
  let status = 500, body = ''

  if (!nonAdminBiketagOpts.game?.length) {
    // const adminBiketagOpts = getBikeTagClientOpts(
    //   {
    //     ...req,
    //     method: req.method,
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
      const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
      const biketagPayload = await getPayloadOpts(req, {
        hash: game.mainhash,
        game: 'none',
        time: 'day',
        cached: true,
      })
      recentResponses.push(
        nonAdminBiketag.getTags(biketagPayload as getTagsPayload, {
          source: imageSource,
          cached: true,
        }),
      )
    }
    const recentTags = (await Promise.allSettled(recentResponses))
      .filter((r) => r.status === 'fulfilled' && r.value?.length)
      .map((d: any) => d.value)

    status = 200
    body = JSON.stringify(recentTags)
  } else {
    const game = (await nonAdminBiketag.game(nonAdminBiketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    const biketagPayload = await getPayloadOpts(req, {
      hash: game.mainhash,
      game: 'none',
      time: 'day',
    })
    const imageSource = !!game.awsRegion ? 'aws' : 'imgur'
    if (imageSource === 'aws') {
      nonAdminBiketag.config({
        aws: {
          region: game.awsRegion
        }
      }, false, true)
    }
    const recentResponse = await nonAdminBiketag.getTags(biketagPayload as getTagsPayload, {
      source: imageSource,
    })
    if (recentResponse.success) {
      status = recentResponse.status
      body = JSON.stringify(recentResponse.success ? recentResponse.data : recentResponse)
    }
  }
  
  return new Response(body, {
    status,
    headers,
  })
}
