import type { Game } from 'biketag'
import { BikeTagClient } from 'biketag'
import { getBikeTagClientOpts, getPayloadOpts } from './common'
// @ts-ignore
import { getSettingsPayload } from 'biketag/dist/common/payloads'

export default async (req: Request) => {
  const biketagOpts = getBikeTagClientOpts(req, true)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = await getPayloadOpts(req, {
    imgur: {
      hash: game.mainhash,
    },
    game: biketagOpts.game,
  })
  const settingsResponse = await biketag.getSettings(biketagPayload as getSettingsPayload, {
    source: 'sanity',
  })
  console.log({settingsResponse})
  const { success, data } = settingsResponse

  return {
    statusCode: settingsResponse.status,
    body: JSON.stringify(success ? data : settingsResponse),
  }
}

