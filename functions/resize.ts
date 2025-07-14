import axios from 'axios'
import sharp from 'sharp'
import { getPayloadOpts } from './common/methods'

export default async (req: Request) => {
  const { url, width, format = 'webp' } = await getPayloadOpts(req)
  const headers: any = [] 
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  let body, statusCode = 200, isBase64Encoded

  console.log({ url, width, format })
  if (!url) {
    statusCode = 400
    body = 'Missing required query params: url'
  }

  let widthNum
  if (width?.length) {
    widthNum = parseInt(width, 10)
    if (isNaN(widthNum) || widthNum <= 0) {
        statusCode = 400
        body = 'Invalid width parameter'
    }
  }

  if (!body) {
    try {
        // Fetch source image
        const response = await axios.get(url, { responseType: 'arraybuffer' })
        const inputBuffer = Buffer.from(response.data)

        // Resize and convert
        const outputBuffer = sharp(inputBuffer)
        if (widthNum) {
            outputBuffer.resize({ width: widthNum })
        }
        const output = await outputBuffer.toFormat(format as keyof sharp.FormatEnum)
            .toBuffer()

        statusCode = 200
        headers['Content-Type'] = `image/${format}`      
        isBase64Encoded = true
        body = output.toString('base64')
    } catch (err) {
        console.error('Error resizing image:', err)
        statusCode = 500
        body = 'Failed to resize image'
    }
  }

  return {
    statusCode,
    isBase64Encoded,
    body,
    headers,
  }
}

