import { BikeTagClient, Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getPayloadOpts,
  HttpStatusCode,
  log,
} from './common'

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[get-recent-tags] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    log('[get-recent-tags] OPTIONS preflight handled')
    return new Response(undefined, {
      status: HttpStatusCode.Ok,
      headers,
    })
  }

  let status = 500
  let body = ''

  try {
    const nonAdminBiketagOpts = getBikeTagClientOpts(req, true)
    log('[get-recent-tags] Parsed BikeTagClient options', nonAdminBiketagOpts)

    const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)

    if (!nonAdminBiketagOpts.game?.length) {
      log('[get-recent-tags] No game specified, loading featured/supported games')

      const featuredGames = await nonAdminBiketag
        .getGame({ game: '', cached: false }, { source: 'sanity' })
        .then((d) => {
          if (d.success) {
            const games = d.data as unknown as Game[]
            const supportedGames = games.filter(
              (g: Game) =>
                g.mainhash?.length &&
                g.archivehash?.length &&
                g.queuehash?.length &&
                g.logo?.length,
            )
            return supportedGames
          }
          return []
        })

      log('[get-recent-tags] Featured games retrieved', { count: featuredGames.length })

      const recentResponses: any = []
      for (let i = 0; i < featuredGames.length; i++) {
        const game = featuredGames[i]
        const imageSource = game.awsRegion ? 'aws' : 'imgur'

        const biketagPayload = await getPayloadOpts(req, {
          hash: game.mainhash,
          game: 'none',
          time: 'day',
          cached: true,
        })

        log('[get-recent-tags] Preparing getTags for game', { game: game.name, imageSource })

        recentResponses.push(
          nonAdminBiketag.getTags(biketagPayload, {
            source: imageSource,
            cached: true,
          }),
        )
      }

      const recentTags = (await Promise.allSettled(recentResponses))
        .filter((r) => r.status === 'fulfilled' && r.value?.length)
        .map((d: any) => d.value)

      log('[get-recent-tags] Aggregated recent tags', { count: recentTags.length })

      status = 200
      body = JSON.stringify(recentTags)
    } else {
      log('[get-recent-tags] Game specified', { game: nonAdminBiketagOpts.game })

      const game = (await nonAdminBiketag.game(nonAdminBiketagOpts.game, {
        source: 'sanity',
        concise: true,
      })) as unknown as Game

      log('[get-recent-tags] Retrieved game', { name: game.name, awsRegion: game.awsRegion })

      const biketagPayload = await getPayloadOpts(req, {
        hash: game.mainhash,
        game: 'none',
        time: 'day',
      })

      const imageSource = game.awsRegion ? 'aws' : 'imgur'
      log('[get-recent-tags] Using image source', { imageSource })

      if (imageSource === 'aws') {
        nonAdminBiketag.config(
          {
            aws: { region: game.awsRegion },
          },
          false,
          true,
        )
        log('[get-recent-tags] AWS config applied', { region: game.awsRegion })
      }

      const recentResponse = await nonAdminBiketag.getTags(biketagPayload, { source: imageSource })
      log('[get-recent-tags] getTags response', {
        success: recentResponse.success,
        status: recentResponse.status,
      })

      if (recentResponse.success) {
        status = recentResponse.status
        body = JSON.stringify(recentResponse.data)
      }
    }
  } catch (err) {
    log('[get-recent-tags] Unexpected error', err, 'error')
    status = HttpStatusCode.InternalServerError
    body = JSON.stringify({ error: 'Internal server error' })
  }

  return new Response(body, {
    status,
    headers,
  })
}
