import { builder, Handler } from '@netlify/functions'
import { getBikeTagClientOpts, getPayloadOpts } from '../src/common/utils'
import { BikeTagClient } from 'biketag'
import { queueTagPayload } from 'biketag/lib/common/payloads'
import request from 'request'

const queueTagHandler: Handler = async (event) => {
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    undefined,
    true
  )
  const biketagPayload = getPayloadOpts(event, { game: biketagOpts.game })
  const biketag = new BikeTagClient(biketagOpts)
  const queueTagResponse = await biketag.queueTag(biketagPayload as queueTagPayload)
  const { success, data } = queueTagResponse

  return {
    statusCode: queueTagResponse.status,
    body: JSON.stringify(success ? data : queueTagResponse),
  }
}

const handler = builder(queueTagHandler)

export { handler }
