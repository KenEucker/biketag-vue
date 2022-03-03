import { DeviceUUID } from '@/common/uuid'
import { Tag } from 'biketag/lib/common/schema'
import { useCookies } from 'vue3-cookies'
import { BiketagFormSteps } from '../../src/common/types'

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

export const getDomainInfo = (req: any): DomainInfo => {
  const nonSubdomainHosts = [
    `${process.env.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
    'localhost',
  ]
  let host = (
    req.headers?.host?.length
      ? req.headers.host
      : req.location?.host?.length
      ? req.location.host
      : ''
  )
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

export const getBikeTagClientOpts = (win?: Window, authorized?: boolean) => {
  const domainInfo = getDomainInfo(win)
  const opts: any = {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
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

export const getMostRecentlyViewedBikeTagTagnumber = (
  currentTagnumber: number,
  mostRecentCookieKey = 'recentTagnumber'
): number => {
  const { cookies } = useCookies()
  const existingMostRecent = cookies.get(mostRecentCookieKey)
  let existingMostRecentNumber = 0

  if (existingMostRecent) {
    existingMostRecentNumber = parseInt(existingMostRecent)
  }

  if (currentTagnumber > 0) {
    const currentTagnumberIsNewer =
      (existingMostRecentNumber > 0 && currentTagnumber > existingMostRecentNumber) ||
      existingMostRecentNumber === 0
    cookies.set(mostRecentCookieKey, currentTagnumber.toString())

    /// Return the numnber that was currently set, if it was set previously, regardless of what the most current tagnumber is
    return currentTagnumberIsNewer ? existingMostRecentNumber : currentTagnumber
  }

  return 0
}

export const getAmbassadorUuid = (win: Window, ambassadorIdCookieKey = 'ambassadorId'): string => {
  const { cookies } = useCookies()
  const existingAmbassadorId = cookies.get('ambassadorId')

  if (existingAmbassadorId) {
    return existingAmbassadorId
  }
  const ambassadorId = GetQueryString(win, 'btaId')

  if (ambassadorId) {
    cookies.set(ambassadorIdCookieKey, ambassadorId)
    return ambassadorId
  }

  return ''
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

export const GetQueryString = (win: Window, name: string): string | null => {
  const after = win.location.hash.split('?')[1]
  if (after) {
    const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
    const r = after.match(reg)
    if (r != null) {
      return decodeURIComponent(r[2])
    }
  }
  return null
}

export const getQueuedTagState = (queuedTag: Tag): BiketagFormSteps => {
  const mysteryImageSet = queuedTag.mysteryImageUrl?.length > 0
  const foundImageSet = queuedTag.foundImageUrl?.length > 0
  let queuedTagState = BiketagFormSteps.queueFound
  if (mysteryImageSet && foundImageSet) {
    const discussionUrlIsSet = queuedTag.discussionUrl && queuedTag.discussionUrl.length > 0
    const mentionUrlIsSet = queuedTag.mentionUrl && queuedTag.mentionUrl.length > 0
    queuedTagState =
      discussionUrlIsSet || mentionUrlIsSet
        ? BiketagFormSteps.queuePosted
        : BiketagFormSteps.queuePostedShare
  } else {
    queuedTagState = foundImageSet ? BiketagFormSteps.queueMystery : BiketagFormSteps.queueFound
  }

  return queuedTagState
}

export const getSanityImageUrl = (
  logo: string,
  size = '',
  sanityBaseCDNUrl = 'https://cdn.sanity.io/images/x37ikhvs/production/'
) => {
  return `${sanityBaseCDNUrl}${logo
    .replace('image-', '')
    .replace('-png', '.png')
    .replace('-jpg', '.jpg')}${size.length ? `?${size}` : ''}`
}

export const getApiUrl = (path: string) => {
  console.log('env', process.env, { path })
  return process.env.CONTEXT === 'dev'
    ? `${window.location.protocol}//${window.location.hostname}:7200/.netlify/functions/${path}`
    : `/api/${path}`
}
