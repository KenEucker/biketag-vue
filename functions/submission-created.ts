import { builder, Handler } from '@netlify/functions'

const myHandler: Handler = async (event) => {
  /// Send new found image queued notification
  /// Send new queued tag submitted notification
  /// Send error report notification to admins
  console.log({ event })

  return {
    data: JSON.stringify({ event }),
    statusCode: 200,
  }
}

const handler = builder(myHandler)

export { handler }
