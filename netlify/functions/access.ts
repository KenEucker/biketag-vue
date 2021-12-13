import { builder, Handler } from '@netlify/functions'

const myHandler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello World' }),
  }
}

const handler = builder(myHandler)

export { handler }
