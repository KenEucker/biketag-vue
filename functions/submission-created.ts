import { builder, Handler } from '@netlify/functions'

const myHandler: Handler = async (event) => {
  /// Send new found image queued notification
  console.log({ event })

  return {
    statusCode: 200,
  }
}

const handler = builder(myHandler)

export { handler }
