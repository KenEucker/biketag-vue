import { builder, Handler } from '@netlify/functions'
import { sendEmail } from '../src/common/utils'

const myHandler: Handler = async (event) => {
  /// Send new found image queued notification
  const emailSent = await sendEmail(
    'keneucker@gmail.com',
    'submission-created',
    JSON.stringify(event)
  )
  /// Send new queued tag submitted notification
  /// Send error report notification to admins
  const out = { event, emailSent }
  console.log({ out })
  return {
    data: JSON.stringify(out),
    statusCode: 200,
  }
}

const handler = builder(myHandler)

export { handler }
