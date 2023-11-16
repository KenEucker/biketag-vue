import { builder, Handler } from '@netlify/functions'

const queueHandler: Handler = async (event) => {
  /// Return all tags within the last 24 hours

  return {
    body: 'hello world',
    statusCode: 200
  }
}

const handler = builder(queueHandler)

export { handler }
