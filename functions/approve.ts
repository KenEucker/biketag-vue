import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from './common/utils'
import { BikeTagClient } from 'biketag'
import { queueTagPayload } from 'biketag/lib/common/payloads'
import request from 'request'

const approveHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
    true
  )
  const biketagPayload = getPayloadOpts(event, { game: biketagOpts.game })
  console.log({ biketagOpts, biketagPayload })
  // const biketag = new BikeTagClient(biketagOpts)

  return {
    statusCode: 200,
    body: 'hi',
  }
}

const handler = builder(approveHandler)

export { handler }
