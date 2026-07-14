import { DeviceUUID } from '@/common/uuid'
import { createClient } from '@sanity/client'
import { Tag } from 'biketag/dist/common/schema'
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
} from '.'
import { getDomainInfo } from './domain'

export { getDomainInfo } from './domain'
export { stringifyNumber, ordinalSuffixOf } from './format'
export { getSupportedGames } from './games'
export { summarizeTagGps } from './gps'
export { getImageSized, getImgurImageSized, getS3ImageSized } from './images'

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

export const readTokenFromDocumentCookie = (tokenCookieKey = 'token'): string => {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${tokenCookieKey}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export const resolveBikeTagJwtToken = (token?: string): string =>
  token ?? getTokenFromCookie() ?? readTokenFromDocumentCookie()

export const getBikeTagJwtAuthHeaders = (token?: string): Record<string, string> => {
  const jwt = resolveBikeTagJwtToken(token)
  return jwt?.length ? { authorization: `JWT ${jwt}` } : {}
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

export const isGlobalAdminEmail = (email?: string | null): boolean => {
  if (!email?.length || !BikeTagEnv.ADMIN_EMAIL?.length) {
    return false
  }

  return email.toLowerCase() === BikeTagEnv.ADMIN_EMAIL.toLowerCase()
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
  errorForm?: HTMLFormElement | null,
  fields: Record<string, string> = {},
) {
  const action = errorForm?.getAttribute('action') ?? 'post-tag-error'
  const params = new URLSearchParams()
  params.set('form-name', action)
  params.set('message', String(message))

  if (errorForm) {
    const formData = new FormData(errorForm)
    for (const [key, value] of formData.entries()) {
      if (key !== 'form-name' && key !== 'message' && String(value).length) {
        params.set(key, String(value))
      }
    }
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value?.length) {
      params.set(key, value)
    }
  }

  return fetch(action, {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: params.toString(),
  })
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

/// TODO: move into the store using the client from the biketagclient
export const getPlayerIsBanned = (playerId: string) => {
  const sanityInstance = createClient({
    projectId: BikeTagEnv.S_PID,
    dataset: BikeTagEnv.S_DSET,
    apiVersion: '2021-06-07',
    useCdn: true,
  })
  const bannedPlayerIds = sanityInstance.fetch(
    `*[_type == "setting" && key == "banned:pid"].value`,
    {},
  )
  return bannedPlayerIds.then((bannedPlayerIds: string[]) => {
    return bannedPlayerIds.includes(playerId)
  })
}

/// TODO: move into the store using the client from the biketagclient
export const getIPIsBanned = (ip: string) => {
  const sanityInstance = createClient({
    projectId: BikeTagEnv.S_PID,
    dataset: BikeTagEnv.S_DSET,
    apiVersion: '2021-06-07',
    useCdn: true,
  })

  const bannedIPs = sanityInstance.fetch(`*[_type == "setting" && key == "banned:ip"].value`, {})
  return bannedIPs.then((bannedIPs: string[]) => {
    return bannedIPs.includes(ip)
  })
}
