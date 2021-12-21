import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/methods'
import { BikeTagClient } from 'biketag'
import { getSettingsPayload } from 'biketag/lib/common/payloads'
import { Game } from 'biketag/lib/common/schema'
import request from 'request'

const setttingsHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts({
    ...event,
    method: event.httpMethod,
  } as unknown as request.Request)
  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const biketagPayload = getPayloadOpts(event, {
    imgur: {
      hash: game.mainhash,
    },
    game: biketagOpts.game,
  })
  const settingsResponse = await biketag.getSettings(biketagPayload as getSettingsPayload, {
    source: 'imgur',
  })
  const { success, data } = settingsResponse

  return {
    statusCode: settingsResponse.status,
    body: JSON.stringify(success ? data : settingsResponse),
  }
}

const handler = builder(setttingsHandler)

export { handler }
