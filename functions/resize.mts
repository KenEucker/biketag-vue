import axios from 'axios'
import sharp from 'sharp'
import { acceptCorsHeaders, getPayloadOpts, log } from './common/methods'

export default async (req: Request) => {
  log('[resize] Incoming request', { method: req.method, url: req.url })

  const { url, width, format = 'webp', rotate } = await getPayloadOpts(req)
  log('[resize] Parsed query params', { url, width, format, rotate })

  const headers = acceptCorsHeaders()
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

  let body
  let status = 200

  if (!url) {
    status = 400
    body = 'Missing required query params: url'
    log('[resize] Missing url parameter', {}, 'error')
  }

  let widthNum
  if (width?.length) {
    widthNum = parseInt(width, 10)
    if (isNaN(widthNum) || widthNum <= 0) {
      status = 400
      body = 'Invalid width parameter'
      log('[resize] Invalid width parameter', { width }, 'error')
    }
  }

  if (!body) {
    try {
      log('[resize] Fetching source image', { url })
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const inputBuffer = Buffer.from(response.data)
      log('[resize] Image fetched, size', { bytes: inputBuffer.length })

      const rotation = rotate ? parseInt(rotate, 10) : undefined
      // Create Sharp instance
      let transformer = sharp(inputBuffer).rotate(rotation)
      log('[resize] Applied rotation', { rotation })

      if (widthNum) {
        transformer = transformer.resize({ width: widthNum })
        log('[resize] Applied resizing', { width: widthNum })
      }

      const output = await transformer.toFormat(format as keyof sharp.FormatEnum).toBuffer()
      log('[resize] Image transformed', { format, finalSize: output.length })

      status = 200
      headers['Content-Type'] = `image/${format}`
      body = output
    } catch (err: any) {
      log('[resize] Error during image processing', { message: err.message }, 'error')
      status = 500
      body = 'Failed to resize image'
    }
  }

  return new Response(body, {
    status,
    headers,
  })
}
