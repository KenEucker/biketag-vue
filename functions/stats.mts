import { BikeTagClient, Game } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getStatsPayload } from 'biketag/dist/common/payloads'


export default async (req: Request) => {
  const biketagOpts = getBikeTagClientOpts(req, true)
   const biketag = new BikeTagClient(biketagOpts)
   const game = (await biketag.game(biketagOpts.game, {
     source: 'sanity',
     concise: true,
   })) as unknown as Game
   const biketagPayload = await getPayloadOpts(event, {
     imgur: {
       hash: game.mainhash,
     },
     game: biketagOpts.game,
   })
   /// TODO: get stats from sanity source first, then fire off new call to gather stats from imgur and save them into sanity
   const statsResponse = await biketag.getStats(biketagPayload as getStatsPayload, {
     source: 'imgur',
   })
   const { success, data } = statsResponse
    return new Response(JSON.stringify(success ? data : statsResponse), {
     status: statsResponse.status
   })
}
