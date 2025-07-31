import { DeviceUUID } from '@/common/uuid'
import { createClient } from '@sanity/client'
import { booleanPointInPolygon, buffer, multiPolygon, point, polygon } from '@turf/turf'
import { Game, Tag } from 'biketag/dist/common/schema'
import CryptoJS from 'crypto-js'
import domtoimage from 'dom-to-image'
import log from 'loglevel'
import moment from 'moment-timezone'
import { useCookies } from 'vue3-cookies'
import {
  BikeTagDefaults,
  BikeTagEnv,
  BikeTagProfile,
  BiketagQueueFormSteps,
  DomainInfo,
  deca,
  special,
} from '.'

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

export const getImageSized = (
  imageSourceOrUrl: 'aws' | 'imgur' | 'sanity' | string = '',
  imageUrlOrSize?: string,
  size: 's' | 'm' | 'l' | 'o' | undefined = 'm',
): string => {
  const sizeMap: Record<string, 'small' | 'medium' | 'original'> = {
    s: 'small',
    m: 'medium',
    l: 'original',
    o: 'original',
  }

  let imageSource
  let imageUrl: string

  // Handle case where imageSource was omitted
  if (!['aws', 'imgur', 'sanity'].includes(imageSourceOrUrl)) {
    imageUrl = imageSourceOrUrl
    if (imageUrlOrSize !== undefined) {
      size = imageUrlOrSize as typeof size
    }
  } else {
    imageSource = imageSourceOrUrl as 'aws' | 'imgur' | 'sanity'
    imageUrl = imageUrlOrSize || ''
  }

  const resolvedSize = sizeMap[size] || 'original'

  // Short-circuit based on image URL
  if (/imgur\.com/.test(imageUrl)) {
    return getImgurImageSized(imageUrl, size)
  }

  if (/digitaloceanspaces\.com/.test(imageUrl)) {
    return getS3ImageSized(imageUrl, resolvedSize)
  }

  // Fallback based on declared or defaulted source
  switch (imageSource) {
    case 'aws':
      return getS3ImageSized(imageUrl, resolvedSize)
    case 'imgur':
    default:
      return getImgurImageSized(imageUrl, size)
  }
}

export const getS3ImageSized = (
  imageUrl: string = '',
  size: 'small' | 'medium' | 'original' = 'original',
): string => {
  if (!imageUrl || size === 'original') return imageUrl

  return imageUrl.replace(/(_small|_medium)?(\.\w+)$/, `_${size}$2`)
}

export const getImgurImageSized = (imgurUrl = '', size = 'm') => {
  return imgurUrl
    .replace('.jpg', `${size}.jpg`)
    .replace('.jpeg', `${size}.jpg`)
    .replace('.gif', `${size}.gif`)
    .replace('.png', `${size}.png`)
    .replace('.webp', `${size}.webp`)
    .replace('.mp4', `${size}.mp4`)
}

export const getDomainInfo = (req: any): DomainInfo => {
  const nonSubdomainHosts = [
    `${BikeTagEnv.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
    'localhost',
  ]
  let host = (
    req.headers?.get('host')?.length
      ? req.headers.get('host')
      : req?.location?.host?.length
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

export const getTagDate = (time: number): Date => new Date(time * 1000)
export const getTagDateISOPlusOffset = (time: number, offset = 'Z'): string =>
  `${new Date(time * 1000).toISOString().slice(0, -1)}${offset?.length ? offset : 'Z'}`
export const getTagDateISOFromTimezone = (time: number, tz?: string) => {
  let datetime = moment(time * 1000)
  if (tz?.length) {
    datetime = datetime.tz(tz)
  }
  return datetime.utc().format()
}

export const getBikeTagClientOpts = (win?: Window, withToken = false) => {
  const domainInfo = getDomainInfo(win)
  return {
    game: domainInfo.subdomain ?? BikeTagEnv.GAME_NAME,
    clientKey: BikeTagEnv.B_KEY,
    imgur: {
      clientId: BikeTagEnv.I_CID,
      // clientSecret: BikeTagEnv.I_CSECRET,
      accessToken: BikeTagEnv.I_TOKEN,
      rapidApiKey: BikeTagEnv.RA_FE_KEY,
      refreshToken: withToken ? BikeTagEnv.I_RTOKEN : undefined,
    },
    sanity: {
      projectId: BikeTagEnv.S_PID,
      dataset: BikeTagEnv.S_DSET,
    },
    aws: {
      accessKeyId: BikeTagEnv.S3_FE_AID,
      secretAccessKey: BikeTagEnv.S3_FE_AKEY,
    },
  }
}

export const setRegionPolygonInCookie = (
  regionPolygon: any,
  regionPolygonCookieKey = 'regionPolygon',
) => {
  localStorage.setItem(regionPolygonCookieKey, JSON.stringify(regionPolygon))

  return regionPolygon
}

export const getRegionPolygonFromCookie = (regionPolygonCookieKey = 'regionPolygon'): any => {
  const regionPolygonString = localStorage.getItem(regionPolygonCookieKey)
  try {
    if (regionPolygonString?.length) {
      const regionPolygon = JSON.parse(regionPolygonString)
      return regionPolygon
    }
  } catch (e: any) {
    console.error('failed to parse region polygon from cookie', e)
  }
}

export const getTokenFromCookie = (tokenCookieKey = 'token'): string => {
  const { cookies } = useCookies()
  return cookies.get(tokenCookieKey)
}

export const setTokenInCookie = (token: string, tokenCookieKey = 'token'): string => {
  const { cookies } = useCookies()
  cookies.set(tokenCookieKey, token)
  return token
}

export const getProfileFromCookie = (profileCookieKey = 'profile'): BikeTagProfile => {
  const { cookies } = useCookies()
  const existingProfileString = cookies.get(profileCookieKey)

  if (existingProfileString) {
    try {
      const existingProfile = decodeBikeTagString(existingProfileString)
      if (existingProfile) {
        return existingProfile as unknown as BikeTagProfile
      }
    } catch (e: any) {
      /// Swallow anonymous
      console.error('failed to decrypt profile in cookie')
    }
  }

  const profile = { sub: new DeviceUUID().get() }
  setProfileCookie(profile)

  return profile
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
        /// BikeTagEnv.B_KEY is intentionally a shared public key
        BikeTagEnv.B_KEY ?? 'BikeTag',
      ).toString()
      cookies.set(profileCookieKey, encryptedProfileString)
    } else {
      cookies.remove(profileCookieKey)
    }

    return true
  } catch (err: any) {
    console.error('could not set profile cookie', err)
    return false
  }
}

export const getQueuedTagFromCookie = (queuedTagCookieKey = 'biketag'): Tag | undefined => {
  const { cookies } = useCookies()
  const existingBikeTag = cookies.get(queuedTagCookieKey)

  debug('play::getQueuedTagFromCookie', { existingBikeTag })
  if (existingBikeTag) {
    /// TODO: does this need to be JSON.parse d?
    return existingBikeTag as unknown as Tag
  }
}

export const setQueuedTagInCookie = (queuedTag?: Tag, queuedTagCookieKey = 'biketag'): boolean => {
  const { cookies } = useCookies()

  debug('play::setQueuedTagInCookie', { queuedTag })
  if (queuedTag) {
    cookies.set(queuedTagCookieKey, JSON.stringify(queuedTag))
  } else {
    cookies.remove(queuedTagCookieKey)
  }

  return true
}

export const encodeBikeTagString = (basic: string): string => {
  /// BikeTagEnv.B_KEY is intentionally a shared public key
  return CryptoJS.AES.encrypt(basic, BikeTagEnv.B_KEY ?? 'BikeTag').toString()
}

export const decodeBikeTagString = (encoded: string): any => {
  const decodedString = CryptoJS.AES.decrypt(encoded, BikeTagEnv.B_KEY ?? 'BikeTag')
  return JSON.parse(decodedString.toString(CryptoJS.enc.Utf8))
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

  const netlifyRequest = fetch(action, {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  })

  if (then) {
    netlifyRequest.then(then)
  }
  return netlifyRequest
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

export const getQueryParam = (win: Window, param: string): string | null => {
  const urlParams = new URLSearchParams(win.location.search)
  return urlParams.get(param)
}

export const getQueuedTagState = (queuedTag: Tag): BiketagQueueFormSteps => {
  const mysteryImageSet = queuedTag.mysteryImageUrl?.length > 0
  const foundImageSet = queuedTag.foundImageUrl?.length > 0
  let queuedTagState = BiketagQueueFormSteps.addFoundImage
  if (mysteryImageSet && foundImageSet) {
    queuedTagState = BiketagQueueFormSteps.roundPosted
  } else {
    queuedTagState = foundImageSet
      ? BiketagQueueFormSteps.addMysteryImage
      : BiketagQueueFormSteps.addFoundImage
  }

  return queuedTagState
}

export const getSupportedGames = (games: Game[]) => {
  const isImgurSupported = (g: Game) =>
    g.mainhash?.length && g.archivehash?.length && g.queuehash?.length
  const isAwsSupported = (g: Game) => g.awsRegion?.length

  return games.filter((g: Game) => (isImgurSupported(g) || isAwsSupported(g)) && g.logo?.length)
}

export const getSanityImageActualSize = (logo: string) => logo?.split('.')[2]?.split('-')[1]

export const getSanityImageResizedSize = (logo: string) => {
  const actualSize = getSanityImageActualSize(logo).split('x')
  const actualSizeWidth = parseInt(actualSize[0])
  const actualSizeHeight = parseInt(actualSize[1])
  const regexForHW = new RegExp(/(?:.*\?)&?(h=\d+)?&?(\w=\d+)?&?(h=\d+)?/g)
  const sanitySizeRequestedMatches = logo.match(regexForHW)
  const sanitySizeRequestedHeight = parseInt(
    sanitySizeRequestedMatches?.find((m) => m?.length && m.includes('h='))?.split('=')[1] ?? '',
  )
  const sanitySizeRequestedWidth = parseInt(
    sanitySizeRequestedMatches?.find((m) => m?.length && m.includes('w='))?.split('=')[1] ?? '',
  )
  const factorOfResize = sanitySizeRequestedHeight / actualSizeHeight
  const factorOfResizeW = sanitySizeRequestedWidth / actualSizeWidth

  return `${Math.round(factorOfResize * actualSizeWidth)}x${Math.round(
    factorOfResize * actualSizeHeight,
  )}`
}

export const getSanityImageUrl = (
  logo: string,
  size = '',
  sanityBaseCDNUrl = BikeTagDefaults.sanityBaseCDNUrl,
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
  if (typeof window === 'undefined') {
    return BikeTagEnv.CONTEXT === 'dev'
      ? `http://localhost:7200/.netlify/functions/${path}`
      : `/api/${path}`
  }

  const url =
    BikeTagEnv.CONTEXT === 'dev'
      ? `${window?.location?.protocol}//${window?.location?.hostname}:7200/.netlify/functions${path.length ? '/' + path : ''}`
      : `/api${path.length ? '/' + path : ''}`

  return url
}

export const exportHtmlToDownload = (filename: string, node?: any, selector?: string): any => {
  if (!node && !selector) {
    debug('data::export', 'nothing to render')
    return
  }
  node = node ?? document.querySelector(selector as string)
  if (!node) {
    debug('data::export', 'node not found')
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

export const debug = (
  message: string,
  context?: any,
  level: 'log' | 'info' | 'warn' | 'error' = 'log',
) => {
  const shouldLogBecauseDebugIsSet =
    getQueryParam(window, 'debug_a') === 'true' || BikeTagEnv.DEBUG_FE === 'true'
  const shouldLogBecauseLevel = level === 'error' || level === 'warn' || level === 'info'
  if (shouldLogBecauseDebugIsSet || shouldLogBecauseLevel) {
    console[level](message, context)
  }
  log.debug(message, context)
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

export const isAuthenticationEnabled = () => !!BikeTagEnv.A_DOMAIN?.length
export const isGmapsEnabled = () => !!BikeTagEnv.G_AKEY?.length

export const dequeueErrorNotify = (toast: any) => (error: string) => {
  return toast.open({
    message: `dequeue tag error: ${error}`,
    type: 'error',
    duration: 10000,
    timeout: false,
    position: 'bottom',
  })
}

export const getBannedIPs = () => {
  const sanityInstance = createClient({
    projectId: BikeTagEnv.S_PID,
    dataset: BikeTagEnv.S_DSET,
    apiVersion: '2021-06-07',
    useCdn: true,
  })

  return sanityInstance.fetch(`*[_type == "setting" && key == "banned:ip"].value`, {})
}
