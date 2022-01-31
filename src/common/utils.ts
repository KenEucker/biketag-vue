import request from 'request'
import { DeviceUUID } from '../common/uuid'
import md5 from 'md5'
import { useCookies } from 'vue3-cookies'

export type DomainInfo = {
  host: string
  subdomain: string | undefined
  isSubdomain: boolean
}

const special = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
]
const deca = ['twent', 'thirt', 'fort', 'fift', 'sixt', 'sevent', 'eight', 'ninet']
export const stringifyNumber = (n: number): string => {
  if (n < 20) return special[n]
  if (n % 10 === 0) return deca[Math.floor(n / 10) - 2] + 'ieth'
  return deca[Math.floor(n / 10) - 2] + 'y-' + special[n % 10]
}

export const getImgurImageSized = (imgurUrl = '', size = 'm') =>
  imgurUrl
    .replace('.jpeg', `${size}.jpg`)
    .replace('.jpg', `${size}.jpg`)
    .replace('.gif', `${size}.gif`)
    .replace('.png', `${size}.png`)
    .replace('.mp4', `${size}.mp4`)

export const getBikeTagHash = (key: string): string => md5(`${key}${process.env.HOST_KEY}`)

export const getDomainInfo = (req: request.Request | undefined, win?: Window): DomainInfo => {
  const nonSubdomainHosts = [
    `${process.env.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
    'localhost',
  ]
  let host = (req ? req.headers.host : win ? win.location.host : '')
    .toLowerCase()
    .replace(/www./g, '')
  let port = null
  let subdomain

  if (host.indexOf(':') > 0) {
    ;[host, port] = host.split(':')
  }

  const isSubdomain = nonSubdomainHosts.indexOf(host) === -1

  if (isSubdomain) {
    const hostSplit = host.split('.')
    subdomain = hostSplit[0]
    host = hostSplit.join('.')
  }

  return {
    host: host + (port ? ':' + port : ''),
    isSubdomain,
    subdomain,
  }
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

export const getBikeTagClientOpts = (req?: request.Request, win?: Window, authorized?: boolean) => {
  const domainInfo = getDomainInfo(req, win)
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
  }

  return opts
}

export const getUuid = (playerIdCookieKey = 'playerId'): string => {
  const { cookies } = useCookies()
  const existingPlayerId = cookies.get(playerIdCookieKey)

  if (existingPlayerId) {
    return existingPlayerId
  }
  const playerId = new DeviceUUID().get()
  cookies.set(playerIdCookieKey, playerId)

  return playerId
}

export const sendNetlifyError = function (
  message: any,
  then?: (value: Response) => Response | PromiseLike<Response>,
  action = 'queue-tag-error'
) {
  const body = new URLSearchParams({
    message,
  }).toString()

  const request = fetch(action, {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  })

  if (then) {
    request.then(then)
  }
  return request
}

export const sendNetlifyForm = function (
  action: string,
  body: any,
  then: (value: Response) => Response | PromiseLike<Response>,
  error = sendNetlifyError
) {
  return fetch(action, {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  })
    .then(then)
    .catch((e) => error(e))
}
