import { BikeTagClient } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import type { getGamePayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const biketagOpts = getBikeTagClientOpts(req, true)
  const biketagPayload = await getPayloadOpts(req, { game: biketagOpts.game })
  const biketag = new BikeTagClient(biketagOpts)
  console.log({biketagPayload})
  const gameResponse = await biketag.getGame(biketagPayload as getGamePayload, { source: 'sanity' })
  const { success, data } = gameResponse

  return {
    statusCode: gameResponse.status,
    body: JSON.stringify(success ? data : gameResponse),
  }
}
