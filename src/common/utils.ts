import { DeviceUUID } from '@/common/uuid'
import { booleanPointInPolygon, buffer, multiPolygon, point, polygon } from '@turf/turf'
import { Tag } from 'biketag/lib/common/schema'
import CryptoJS from 'crypto-js'
import domtoimage from 'dom-to-image'
import log from 'loglevel'
import md5 from 'md5'
import { useCookies } from 'vue3-cookies'
import { BikeTagProfile, BiketagFormSteps } from '../../src/common/types'

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
// https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
export const ordinalSuffixOf = (n: number) => {
  const j = n % 10,
    k = n % 100
  if (j == 1 && k != 11) {
    return n + 'st'
  }
  if (j == 2 && k != 12) {
    return n + 'nd'
  }
  if (j == 3 && k != 13) {
    return n + 'rd'
  }
  return n + 'th'
}
export const getBikeTagHash = (val: string): string => md5(`${val}${process.env.HOST_KEY}`)

export const getImgurImageSized = (imgurUrl = '', size = 'm') =>
  imgurUrl
    .replace('.jpeg', `${size}.jpg`)
    .replace('.jpg', `${size}.jpg`)
    .replace('.gif', `${size}.gif`)
    .replace('.png', `${size}.png`)
    .replace('.webp', `${size}.webp`)
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
  let subdomain = null

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

export const getBikeTagClientOpts = (win?: Window) => {
  const domainInfo = getDomainInfo(win)
  return {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
    imgur: {
      clientId: process.env.I_CID,
      clientSecret: process.env.I_CSECRET,
      refreshToken: process.env.I_RTOKEN,
    },
    sanity: {
      projectId: process.env.S_PID,
      dataset: process.env.S_DSET,
    },
  }
}

export const getProfileFromCookie = (profileCookieKey = 'profile'): BikeTagProfile => {
  const { cookies } = useCookies()
  const existingProfileString = cookies.get(profileCookieKey)

  if (existingProfileString) {
    try {
      const existingProfileDecodedString = CryptoJS.AES.decrypt(
        existingProfileString,
        process.env.HOST_KEY ?? 'BikeTag',
      )
      const existingProfile = JSON.parse(existingProfileDecodedString.toString(CryptoJS.enc.Utf8))
      return existingProfile
    } catch (e) {
      /// Swallow anonymous
      console.error('failed to decrypt profile in cookie')
    }
  }

  const profile = { sub: new DeviceUUID().get() }
  setProfileCookie(profile)

  return profile
}

export const getQueuedTagFromCookie = (biketagCookieKey = 'biketag'): Tag | undefined => {
  const { cookies } = useCookies()
  const existingBikeTag = cookies.get(biketagCookieKey)

  debug('getQueuedTagFromCookie', { existingBikeTag })
  if (existingBikeTag) {
    return existingBikeTag as unknown as Tag
  }
}

export const setQueuedTagInCookie = (queuedTag?: Tag, biketagCookieKey = 'biketag'): boolean => {
  const { cookies } = useCookies()

  debug('setQueuedTagInCookie', { queuedTag })
  if (queuedTag) {
    cookies.set(biketagCookieKey, JSON.stringify(queuedTag))
  } else {
    cookies.remove(biketagCookieKey)
  }

  return true
}

export const setProfileCookie = (
  profile?: BikeTagProfile,
  profileCookieKey = 'profile',
): boolean => {
  try {
    const { cookies } = useCookies()

    if (profile) {
      const encryptedProfileString = CryptoJS.AES.encrypt(
        JSON.stringify(profile),
        process.env.HOST_KEY ?? 'BikeTag',
      ).toString()
      cookies.set(profileCookieKey, encryptedProfileString)
    } else {
      cookies.remove(profileCookieKey)
    }

    return true
  } catch (err) {
    console.error('could not set profile cookie', err)
    return false
  }
}

export const setNPAuthorization = (basic: string): string => {
  return CryptoJS.AES.encrypt(basic, process.env.HOST_KEY ?? 'BikeTag').toString()
}

export const getMostRecentlyViewedBikeTagTagnumber = (
  currentTagnumber: number,
  mostRecentCookieKey = 'mostRecentlyViewedTagnumber',
): number => {
  const { cookies } = useCookies()
  const existingMostRecent = cookies.get(mostRecentCookieKey)
  let existingMostRecentNumber = 0

  if (existingMostRecent?.length) {
    existingMostRecentNumber = parseInt(existingMostRecent)
  }

  if (currentTagnumber > 0) {
    const currentTagnumberIsNewer =
      (existingMostRecentNumber > 0 && currentTagnumber > existingMostRecentNumber) ||
      existingMostRecentNumber === 0
    if (currentTagnumberIsNewer) {
      console.log('setting most recently viewed tag', {
        existingMostRecent,
        currentTagnumberIsNewer,
        currentTagnumber,
      })
      cookies.set(mostRecentCookieKey, currentTagnumber.toString())
    }

    /// Return the numnber that was currently set, if it was set previously, regardless of what the most current tagnumber is
    return currentTagnumberIsNewer ? existingMostRecentNumber : currentTagnumber
  }

  return 0
}

export const sendNetlifyError = function (
  message: any,
  then?: (value: Response) => Response | PromiseLike<Response>,
  action = 'post-tag-error',
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
  error = sendNetlifyError,
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
  let queuedTagState = BiketagFormSteps.addFoundImage
  if (mysteryImageSet && foundImageSet) {
    // const discussionUrlIsSet = queuedTag.discussionUrl && queuedTag.discussionUrl.length > 0
    // const mentionUrlIsSet = queuedTag.mentionUrl && queuedTag.mentionUrl.length > 0
    // queuedTagState =
    //   discussionUrlIsSet || mentionUrlIsSet
    //     ? BiketagFormSteps.roundPosted
    //     : BiketagFormSteps.shareBikeTagPost
    queuedTagState = BiketagFormSteps.roundPosted
  } else {
    queuedTagState = foundImageSet
      ? BiketagFormSteps.addMysteryImage
      : BiketagFormSteps.addFoundImage
  }

  return queuedTagState
}

export const getSanityImageActualSize = (
  logo: string,
  ) => logo?.split('.')[2]?.split('-')[1]

export const getSanityImageResizedSize = (
    logo: string,
    ) => {
      const actualSize = getSanityImageActualSize(logo).split('x')
      const actualSizeWidth = parseInt(actualSize[0])
      const actualSizeHeight = parseInt(actualSize[1])
      const regexForHW = new RegExp(/(?:.*\?)&?(\h\=\d+)?&?(\w\=\d+)?&?(\h\=\d+)?/g)
      const sanitySizeRequestedMatches = logo.match(regexForHW)
      // const sanitySizeRequestedHeight = parseInt(sanitySizeRequestedMatches?.find(m => m?.length && m.includes('h='))?.split('=')[1] ?? '')
      const sanitySizeRequestedWidth = parseInt(sanitySizeRequestedMatches?.find(m => m?.length && m.includes('w='))?.split('=')[1] ?? '')
      const factorOfResize = sanitySizeRequestedWidth / actualSizeWidth
      console.log({actualSize, actualSizeWidth, actualSizeHeight, sanitySizeRequestedMatches, sanitySizeRequestedWidth, factorOfResize})

      return `${factorOfResize * actualSizeWidth}x${factorOfResize * actualSizeHeight}`
    }

export const getSanityImageUrl = (
  logo: string,
  size = '',
  sanityBaseCDNUrl = 'https://cdn.sanity.io/images/x37ikhvs/production/',
  squared = false,
) => {
  switch (size) {
    case 'l':
      size = '512'
      break
    case 'm':
      size = '256'
      break
    case 's':
      size = '192'
      break
    default:
      size = '45'
      break
  }
  size = `h=${size}${squared ? `&w=${size}` : ''}`

  return `${sanityBaseCDNUrl}${logo
    .replace('image-', '')
    .replace('-png', '.png')
    .replace('-webp', '.webp')
    .replace('-gif', '.gif')
    .replace('-jpg', '.jpg')}${size.length ? `?${size}` : ''}`
}

export const getApiUrl = (path = '') => {
  const url =
    process.env.CONTEXT === 'dev'
      ? `${window.location.protocol}//${window.location.hostname}:7200/.netlify/functions/${path}`
      : `/api/${path}`

  return url
}

export const exportHtmlToDownload = (filename: string, node?: any, selector?: string): any => {
  if (!node && !selector) {
    debug('nothing to render')
    return
  }
  node = node ?? document.querySelector(selector as string)
  if (!node) {
    debug('node not found')
    return
  }

  return domtoimage
    .toPng(node)
    .then(function (dataUrl) {
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = dataUrl
      link.click()
      return dataUrl
    })
    .catch(function (error) {
      console.error('oops, something went wrong!', error)
    })
}

export const debug = (message: string, context?: any) => {
  console.log(message, { context })
  log.debug(message, { context })
}

export const feetToKm = (feets: number) => feets * 0.0003048

export const isPointInPolygon = (
  geojson: any,
  gps: { lng: number; lat: number },
  distanceOffInFeet: number,
) => {
  const distanceOffInKilometers = feetToKm(distanceOffInFeet)

  // Create turf.js point and polygon
  const turfPoint = point([gps.lng, gps.lat])
  const turfPolygon =
    geojson.type === 'MultiPolygon'
      ? multiPolygon(geojson.coordinates)
      : polygon(geojson.coordinates)

  // Buffer the polygon by the error amount
  const bufferedPolygon = buffer(turfPolygon, distanceOffInKilometers, { units: 'kilometers' })

  // Check if the point is inside the buffered polygon
  return booleanPointInPolygon(turfPoint, bufferedPolygon)
}

export const isOnline = async (checkExternally = false) => {
  if (navigator.onLine && !checkExternally) {
    return true
  } else if (!navigator.onLine && !checkExternally) {
    return false
  }

  return await fetch('/favicon.ico?d=' + Date.now())
    .then((response) => response.ok)
    .catch(() => false)
}
