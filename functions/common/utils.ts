import request from 'request'
import { getDomainInfo } from '../../src/common/utils'
import md5 from 'md5'
import crypto from 'crypto'

export const getBikeTagHash = (key: string): string => md5(`${key}${process.env.HOST_KEY}`)

export const getBikeTagClientOpts = (
  req?: request.Request,
  authorized?: boolean,
  admin?: boolean
) => {
  const domainInfo = getDomainInfo(req)
  const isAuthenticatedPOST = req?.method === 'POST' || authorized
  const isGET = !isAuthenticatedPOST && req?.method === 'GET'
  const opts: any = {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
    cached: isGET || !isAuthenticatedPOST,
    imgur: {
      clientId: process.env.IMGUR_CLIENT_ID,
    },
  }

  if (authorized) {
    opts.imgur = opts.imgur ?? {}
    opts.imgur.clientSecret = process.env.IMGUR_CLIENT_SECRET
    opts.imgur.accessToken = process.env.IMGUR_ACCESS_TOKEN
    opts.imgur.refreshToken = process.env.IMGUR_REFRESH_TOKEN

    opts.sanity = opts.sanity ?? {}
    opts.sanity.projectId = process.env.SANITY_PROJECT_ID
    opts.sanity.dataset = process.env.SANITY_DATASET

    if (admin) {
      opts.imgur = opts.imgur ?? {}
      opts.imgur.clientId = process.env.IMGUR_ADMIN_CLIENT_ID
      opts.imgur.clientSecret = process.env.IMGUR_ADMIN_CLIENT_SECRET
      opts.imgur.accessToken = process.env.IMGUR_ADMIN_ACCESS_TOKEN
      opts.imgur.refreshToken = process.env.IMGUR_ADMIN_REFRESH_TOKEN
    }
  }

  return opts
}

export const parseQuery = (query = '') => {
  const params: any = new URLSearchParams(query) ?? []
  return Object.fromEntries(params)
}

export const parseBody = (body = '') => {
  let parsed = {}
  try {
    parsed = JSON.parse(body)
  } catch (e) {
    parsed = parseQuery(body)
  }

  return parsed
}

export const getPayloadOpts = (event: any, base = {}): any => {
  const parsedQuery = parseQuery(event.rawQuery)
  const parsedBody = parseBody(event.body)
  return {
    ...base,
    ...parsedQuery,
    ...parsedBody,
  }
}

export const getPayloadAuthorization = (event: any) => {
  const { authorization } = event.headers
  const bearer = 'Bearer '
  const clientId = 'Client-ID '

  if (authorization?.indexOf(bearer) === 0) {
    return authorization.substr(bearer.length)
  } else if (authorization?.indexOf(clientId) === 0) {
    return authorization.substr(clientId.length)
  } else {
    return authorization
  }
}

const noKey = 'BikeTag'
export const createMd5 = (text: string): Buffer => {
  return crypto.createHash('md5').update(text).digest()
}

export const encrypt = (t: any, key?: string) => {
  try {
    t = typeof t !== 'string' ? JSON.stringify(t) : t
    const secretKey = key ?? process.env.HOST_KEY ?? noKey

    let encryptedKey = createMd5(secretKey)
    encryptedKey = Buffer.concat([encryptedKey, encryptedKey.slice(0, 8)]) // properly expand 3DES key from 128 bit to 192 bit

    const cipher = crypto.createCipheriv('des-ede3', encryptedKey, '')
    const encrypted = cipher.update(t, 'utf8', 'base64')

    return encrypted + cipher.final('base64')
  } catch (e) {
    /// swallow exception
    return null
  }
}

export const decrypt = (encryptedBase64: string, key?: string) => {
  try {
    const secretKey = key ?? process.env.HOST_KEY ?? noKey
    let encryptedKey = createMd5(secretKey)
    encryptedKey = Buffer.concat([encryptedKey, encryptedKey.slice(0, 8)]) // properly expand 3DES key from 128 bit to 192 bit
    const decipher = crypto.createDecipheriv('des-ede3', encryptedKey, '')
    let decrypted: any = decipher.update(encryptedBase64, 'base64')
    decrypted += decipher.final()

    const jsonObject = JSON.parse(decrypted)

    return jsonObject || decrypted
  } catch (e) {
    /// swallow exception
    return null
  }
}
