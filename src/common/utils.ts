import request from 'request'
import { DeviceUUID } from '../common/uuid'
import md5 from 'md5'

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

// export const parseMultipartForm = async (event: any): Promise<any> => {
//   return new Promise((resolve) => {
//     // we'll store all form fields inside of this
//     const fields: any = {}

//     // let's instantiate our busboy instance!
//     const busboy = new Busboy({
//       // it uses request headers
//       // to extract the form boundary value (the ----WebKitFormBoundary thing)
//       headers: event.headers, //{ ...event.headers, 'content-type': event.headers['Content-Type'] },
//     })

//     // before parsing anything, we need to set up some handlers.
//     // whenever busboy comes across a file ...
//     busboy.on(
//       'file',
//       (
//         fieldname: string | number,
//         filestream: { on: (arg0: string, arg1: (data: any) => void) => void },
//         filename: any,
//         transferEncoding: any,
//         mimeType: any
//       ) => {
//         // ... we take a look at the file's data ...
//         filestream.on('data', (data) => {
//           // ... and write the file's name, type and content into `fields`.
//           fields[fieldname] = {
//             filename,
//             type: mimeType,
//             content: data,
//           }
//         })
//       }
//     )

//     // whenever busboy comes across a normal field ...
//     busboy.on('field', (fieldName: string | number, value: any) => {
//       // ... we write its value into `fields`.
//       fields[fieldName] = value
//     })

//     // once busboy is finished, we resolve the promise with the resulted fields.
//     busboy.on('finish', () => {
//       resolve(fields)
//     })

//     // now that all handlers are set up, we can finally start processing our request!
//     busboy.write(event.body)
//   })
// }

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

export const getBikeTagClientOpts = (req?: request.Request) => {
  const domainInfo = getDomainInfo(req)
  const isAuthenticatedPOST = req?.method === 'POST'
  const isGET = !isAuthenticatedPOST && req?.method === 'GET'
  return {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
    cached: isGET || !isAuthenticatedPOST,
    imgur: {
      clientId: process.env.IMGUR_CLIENT_ID,
      accessToken: process.env.IMGUR_ACCESS_TOKEN,
      refreshToken: process.env.IMGUR_REFRESH_TOKEN,
      hash: process.env.IMGUR_HASH,
    },
    sanity: {
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
    },
  }
}

export const getUuid = () => {
  return new DeviceUUID().get()
}

export const getIpInformation = () => {
  return fetch('http://www.geoplugin.net/json.gp', {
    method: 'GET',
    mode: 'cors', // no-cors, *cors, same-origin
    credentials: 'same-origin',
    redirect: 'follow',
  })
    .then(async (req) => {
      const { geoplugin_status, geoplugin_request, geoplugin_countryName } = await req.json()
      if (geoplugin_status / 100 >= 2 && geoplugin_status / 100 < 3) {
        return {
          ip: geoplugin_request,
          country: geoplugin_countryName,
        }
      } else {
        return {
          ip: '0.0.0.0',
          country: 'unknown',
        }
      }
    })
    .catch((err) => {
      return err
    })
}

export const sendNetlifyError = function (
  message: any,
  then?: (value: Response) => Response | PromiseLike<Response>,
  action = 'queue-tag-error'
) {
  const body = new URLSearchParams({
    message,
    ip: '',
    ///playerId
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
