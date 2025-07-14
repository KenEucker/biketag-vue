import { builder, Handler } from '@netlify/functions'
import axios from 'axios'
import sharp from 'sharp'
import { getPayloadOpts } from './common/methods'

const resizeHandler: Handler = async (event) => {
  const { url, width, format = 'webp' } = getPayloadOpts(event)

  console.log({ url, width, format })
  if (!url || !width) {
    return {
      statusCode: 400,
      body: 'Missing required query params: url and width',
    }
  }

  const widthNum = parseInt(width, 10)
  if (isNaN(widthNum) || widthNum <= 0) {
    return {
      statusCode: 400,
      body: 'Invalid width parameter',
    }
  }

  try {
    // Fetch source image
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    const inputBuffer = Buffer.from(response.data)

    // Resize and convert
    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: widthNum })
      .toFormat(format as keyof sharp.FormatEnum)
      .toBuffer()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': `image/${format}`,
      },
      isBase64Encoded: true,
      body: outputBuffer.toString('base64'),
    }
  } catch (err) {
    console.error('Error resizing image:', err)
    return {
      statusCode: 500,
      body: 'Failed to resize image',
    }
  }
}

const handler = builder(resizeHandler)

export { handler }

