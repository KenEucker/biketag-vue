import { JwtVerifier, getTokenFromHeader } from '@serverless-jwt/jwt-verifier'
import Ajv from 'ajv'
import axios from 'axios'
import BikeTagClient from 'biketag'
import { Ambassador, Game, Player, Tag } from 'biketag/lib/common/schema'
import crypto from 'crypto'
import CryptoJS from 'crypto-js'
import { readFileSync } from 'fs'
import * as jose from 'jose'
import { Liquid } from 'liquidjs'
import lzutf8 from 'lzutf8'
import md5 from 'md5'
import nodemailer from 'nodemailer'
import { extname, join } from 'path'
import qs from 'qs'
import request from 'request'
import { BikeTagProfile } from '../../src/common/types'
import {
  getDomainInfo,
  getImgurImageSized,
  getTagDate,
  isAuthenticationEnabled,
} from '../../src/common/utils'
import { ErrorMessage, HttpStatusCode } from './constants'
import { BackgroundProcessResults, activeQueue } from './types'

const ajv = new Ajv()
export const getBikeTagHash = (val: string): string => md5(`${val}${process.env.HOST_KEY}`)

export const getApiUrl = (game = '', path = ''): string =>
  process.env.CONTEXT === 'dev'
    ? `http://${game.length ? `${game}.` : ''}${process.env.HOST}:7200/.netlify/functions/${path}`
    : `https://${game.length ? `${game}.` : ''}${process.env.HOST}/api/${path}`

export const isRequestAllowed = (
  req: any,
  authorized?: boolean,
  admin?: boolean,
  isFrontendRequest?: boolean,
  restrictMethod?: string[] | string,
): boolean => {
  if (restrictMethod?.length) {
    const restrictMethods = typeof restrictMethod === 'string' ? [restrictMethod] : restrictMethod
    if (restrictMethods!.indexOf(req.httpMethod.toLowerCase()) === -1) {
      return false
    }
  }

  return true
  // TODO: fill out the checks below
  if (authorized) {
    if (admin) {
      return false
    }
    return false
  }

  if (isFrontendRequest) {
    if (authorized) {
      if (admin) {
        return false
      }
      return false
    }

    return req.headers.referrer.includes(process.env.HOST)
  }

  return false
}

export const getBikeTagClientOpts = (
  req?: request.Request,
  authorized?: boolean,
  admin?: boolean,
  game?: Game,
) => {
  const request = req ?? { method: 'GET' }
  const domainInfo = getDomainInfo(request)
  const isAuthenticatedPOST = request?.method === 'POST' || authorized
  const isGET = !isAuthenticatedPOST && request?.method === 'GET'

  /// The minimum to load a BikeTag Game in Read-Only mode
  const opts: any = {
    game:
      game?.name?.toLocaleLowerCase() ??
      game?.slug ??
      domainInfo.subdomain ??
      process.env.GAME_NAME,
    cached: isGET || !isAuthenticatedPOST,
    accessToken: process.env.ACCESS_TOKEN,
    imgur: {
      clientId: process.env.I_CID,
      hash: game?.mainhash,
      queuehash: game?.queuehash,
      archivehash: game?.archivehash,
    },
  }

  /// Credentials to make changes to the BikeTag Game
  if (authorized) {
    /// Enables Imgur uploads and edits for non-admin sources
    opts.imgur = opts.imgur ?? {}
    opts.imgur.clientSecret = process.env.I_CSECRET
    opts.imgur.accessToken = process.env.I_TOKEN
    opts.imgur.refreshToken = process.env.I_RTOKEN

    // opts.reddit = opts.reddit ?? {}
    // opts.reddit.clientId = process.env.R_CID
    // opts.reddit.clientSecret = process.env.R_CSECRET
    /// TODO: comes from sanity game settings
    // opts.reddit.username = process.env.R_UNAME
    // opts.reddit.password = process.env.R_PASS

    opts.sanity = opts.sanity ?? {}
    opts.sanity.projectId = process.env.S_PID
    opts.sanity.dataset = process.env.S_DSET
    opts.sanity.token = process.env.S_TOKEN

    if (admin) {
      opts.imgur.clientId = process.env.IA_CID?.length ? process.env.IA_CID : opts.imgur.clientId
      opts.imgur.clientSecret = process.env.IA_CSECRET?.length
        ? process.env.IA_CSECRET
        : opts.imgur.clientSecret
      opts.imgur.accessToken = process.env.IA_TOKEN ?? ''
      opts.imgur.refreshToken = process.env.IA_RTOKEN ?? opts.imgur.refreshToken

      opts.sanity = opts.sanity ?? {}
      opts.sanity.projectId = process.env.SA_PID
      opts.sanity.dataset = process.env.SA_DSET
      opts.sanity.token = process.env.SA_TOKEN

      // opts.reddit.clientId = process.env.RA_CID
      // opts.reddit.clientSecret = process.env.RA_CSECRET
      // opts.reddit.username = process.env.RA_UNAME
      // opts.reddit.password = process.env.RA_PASS
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

export const isValidJson = (data, type = 'none') => {
  let schema = {}

  switch (type) {
    case 'profile.patch':
      schema = {
        type: 'object',
        properties: {
          user_metadata: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              passcode: { type: 'string' },
              options: {
                type: 'object',
                properties: {
                  skipSteps: { type: 'boolean' },
                },
                minProperties: 1,
                additionalProperties: false,
              },
              social: {
                type: 'object',
                properties: {
                  reddit: { type: 'string' },
                  instagram: { type: 'string' },
                  twitter: { type: 'string' },
                  imgur: { type: 'string' },
                  discord: { type: 'string' },
                },
                minProperties: 1,
                additionalProperties: false,
              },
            },
            minProperties: 1,
            additionalProperties: false,
          },
        },
        required: ['user_metadata'],
        additionalProperties: false,
      }
      break
    case 'profile.patch.ambassador':
      schema = {
        type: 'object',
        properties: {
          user_metadata: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              passcode: { type: 'string' },
              options: {
                type: 'object',
                properties: {
                  skipSteps: { type: 'boolean' },
                },
                minProperties: 1,
                additionalProperties: false,
              },
              social: {
                type: 'object',
                properties: {
                  reddit: { type: 'string' },
                  instagram: { type: 'string' },
                  twitter: { type: 'string' },
                  imgur: { type: 'string' },
                  discord: { type: 'string' },
                },
                minProperties: 1,
                additionalProperties: false,
              },
              credentials: {
                type: 'object',
                properties: {
                  imgur: {
                    type: 'object',
                    properties: {
                      clientId: { type: 'string' },
                      clientSecret: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                  sanity: {
                    type: 'object',
                    properties: {
                      projectId: { type: 'string' },
                      dataset: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                  reddit: {
                    type: 'object',
                    properties: {
                      clientId: { type: 'string' },
                      clientSecret: { type: 'string' },
                      username: { type: 'string' },
                      password: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
            },
            minProperties: 1,
            additionalProperties: false,
          },
        },
        required: ['user_metadata'],
        additionalProperties: false,
      }
      break
    case 'profile.put':
      schema = {
        type: 'object',
        properties: {
          user_metadata: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        required: ['user_metadata'],
        additionalProperties: false,
      }
      break
  }

  const validate = ajv.compile(schema)

  return validate(data)
}

interface Event {
  headers: Record<string, unknown>
}

export interface IdentityContext {
  /**
   * The token that was provided.
   */
  token: string

  /**
   * Claims for the authenticated user.
   */
  claims: Record<string, unknown>
}

/// For netlify identity JWT decoding
const validateJWT = (verifier: JwtVerifier, options: any) => {
  return (handler: any) => async (event: Event, context: any, cb: any) => {
    let claims
    let accessToken

    try {
      accessToken = getTokenFromHeader(event.headers.authorization as string)
      claims = await verifier.verifyAccessToken(accessToken)
    } catch (err) {
      if (typeof options.handleError !== 'undefined' && options.handleError !== null) {
        return options.handleError(err)
      }

      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: err.code,
          error_description: err.message,
        }),
      }
    }

    // Expose the identity in the client context.
    const ctx: IdentityContext = {
      token: accessToken,
      claims,
    }
    context.identityContext = ctx

    // Continue.
    return handler(event, context, cb)
  }
}

export const getThisGamesAmbassadors = async (client: BikeTagClient, adminBikeTagOpts?: any) => {
  if (!client) {
    adminBikeTagOpts =
      adminBikeTagOpts ??
      getBikeTagClientOpts(
        {
          method: 'get',
        } as unknown as request.Request,
        true,
        true,
      )
  }
  client = client ?? new BikeTagClient(adminBikeTagOpts)
  const thisGamesAmbassadors = await client.ambassadors(undefined, {
    source: 'sanity',
  })

  return thisGamesAmbassadors
}

export const getProfileAuthorization = async (event: any): Promise<any> => {
  const authorization = await getPayloadAuthorization(event)
  let profile: any = authorization

  if (authorization && profile) {
    const adminBiketagOpts = getBikeTagClientOpts(event, true, true)
    const adminBiketag = new BikeTagClient(adminBiketagOpts)
    const thisGamesAmbassadors = (await getThisGamesAmbassadors(adminBiketag)) as Ambassador[]
    if (!thisGamesAmbassadors?.length) {
      return profile
    }
    const profileAmbassadorMatch = thisGamesAmbassadors.filter((a) => a.email === profile.email)
    const isABikeTagAmbassador = profileAmbassadorMatch.length
      ? true
      : profile.email && profile.email === process.env.ADMIN_EMAIL

    if (isABikeTagAmbassador) {
      profile.isBikeTagAmbassador = true
      profile = { ...profile, ...profileAmbassadorMatch[0] }
    }
  }

  /// TODO: pear down this object to only the things we care about
  return profile
}

export const getPayloadAuthorization = async (event: any): Promise<any> => {
  let authorizationString = event.headers.authorization
  const basic = 'Basic '
  const bearer = 'Bearer '
  const client = 'Client-ID '

  const authorizationType: string | null =
    authorizationString?.indexOf(basic) === 0
      ? 'basic'
      : authorizationString?.indexOf(client) === 0
        ? 'client'
        : authorizationString?.indexOf(bearer) === 0
          ? 'bearer'
          : null

  const getBasicAuthProfile = (authorizationString: string) => {
    /// Basic Auth: "Basic [name]::[password]""
    // console.log('basic', { authorizationString })
    const namePasscodeString = CryptoJS.AES.decrypt(authorizationString, process.env.HOST_KEY ?? '')
    const decryptedPasscode = namePasscodeString.toString(CryptoJS.enc.Utf8)
    if (decryptedPasscode) {
      const namePasscodeSplit = decryptedPasscode.split('::')

      return {
        name: namePasscodeSplit[0],
        passcode: namePasscodeSplit[1],
      }
    }
    return {
      name: null,
      passcode: null,
    }
  }

  const getNetlifyAuthProfile = async (authorizationString: string) => {
    // console.log('netlify', { authorizationString })
    try {
      const verifierOpts = { issuer: '', audience: '' }
      const verifier = new JwtVerifier(verifierOpts)
      return await validateJWT(verifier, verifierOpts)
    } catch (e) {
      console.error({ authorizationNetlifyValidationError: e })
    }
    return null
  }

  const getAuth0AuthProfile = async (authorizationString: string) => {
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${process.env.A_DOMAIN}/.well-known/jwks.json`),
      )

      const { payload } = await jose.jwtVerify(authorizationString, JWKS)
      return payload
    } catch (e) {
      /// Swallow error
      if (e.code === 'ERR_JWT_EXPIRED') return null

      return authorizationString
    }
  }

  /// DEBUG: uncomment to check incoming authorization credentials
  // console.log({ orign: event.headers.authorization, authorizationType, authorizationString })

  switch (authorizationType) {
    case 'basic':
      authorizationString = authorizationString.substring(basic.length)
      return getBasicAuthProfile(authorizationString)
    case 'netlify':
      authorizationString = authorizationString.substring(client.length)
      return getNetlifyAuthProfile(authorizationString)
    case 'client':
      authorizationString = authorizationString.substring(client.length)
      return getAuth0AuthProfile(authorizationString)
    case 'bearer':
      authorizationString = authorizationString.substring(bearer.length)
      return getAuth0AuthProfile(authorizationString)
    default:
      authorizationString = authorizationString?.length
        ? 'authorization type not supported'
        : authorizationString
      break
  }

  return null
}

export const defaultLogo = '/images/BikeTag.svg'

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
    // console.log(e)
    return null
  }
}

export const compress = lzutf8.compress
export const decompress = lzutf8.decompress

let liquidInstance
export const liquidOpts = {
  dynamicPartials: true,
  strict_filters: true,
  extname: '.liquid',
  // root: [join('functions', 'emails')],
  customFilters: {
    biketag_image: (url = '', size = '') => {
      const ext = extname(url)
      /// Make sure the image type is supported
      if (['.jpg', '.jpeg', '.png', '.bmp', '.webp'].indexOf(ext) === -1) return url

      switch (size) {
        default:
        case 'original':
        case '':
          break

        case 's':
        case 'm':
        case 'small':
        case 'medium':
          size = 's'
          break

        case 'l':
        case 'large':
          size = 'l'
          break
      }

      return url.replace(ext, `${size}${ext}`)
    },
  },
}

const getLiquidInstance = () => {
  if (liquidInstance) return liquidInstance

  liquidInstance = new Liquid(liquidOpts)

  return liquidInstance
}

export const sendEmail = async (to: string, subject: string, locals: any, template?: string) => {
  if (!(process.env.G_EMAIL && process.env.G_PASS)) return null

  template = template ?? subject
  let html = ''
  let text = ''

  const liquid = getLiquidInstance()

  Object.keys(liquidOpts.customFilters).forEach((filter) => {
    const filterMethod = liquidOpts.customFilters[filter]
    liquid.registerFilter(filter, filterMethod)
  })
  const templateFilePath = join('functions', 'emails', template)
  const htmlTemplateFilePath = `${templateFilePath}.liquid`
  const textTemplateFilePath = `${templateFilePath}--text.liquid`

  try {
    // if (existsSync(htmlTemplateFilePath)) {
    const htmlTemplate = readFileSync(htmlTemplateFilePath).toString()
    html = liquid.parseAndRenderSync(htmlTemplate, locals)
    // }
    // if (existsSync(textTemplateFilePath)) {
    const textTemplate = readFileSync(textTemplateFilePath).toString()
    text = liquid.parseAndRenderSync(textTemplate, locals)
    // }
  } catch (e) {
    console.log({ e })
  }

  if (!html.length) {
    console.log('no html was loaded', { templateFilePath, htmlTemplateFilePath })
    return null
  }

  const emailOpts = {
    from: process.env.G_EMAIL, // sender address
    to, // list of receivers
    subject, // subject
    text, // plain text body
    html, // html body
  }

  const transporterOpts: any = {
    auth: {
      user: process.env.G_EMAIL,
      pass: process.env.G_PASS,
    },
    service: 'gmail',
  }

  const transporter = nodemailer.createTransport(transporterOpts)

  const info = await transporter.sendMail(emailOpts)

  /// TODO: formulate the response into something usable
  return info
}

export const getEncodedExpiry = (data = {}, days = 2) => {
  const expiryData = {
    ...data,
    expiry: new Date(
      /// Expiry is now plus  Ms     s    h    days  x (default 2)
      new Date().getTime() + 1000 * 60 * 60 * 24 * days,
    ),
  }
  return encodeURIComponent(!encrypt(expiryData))
}

export const sendEmailsToAmbassadors = async (
  emailName: string,
  emailSubject: string,
  ambassadors: Ambassador[],
  getEmailData: (a?: Ambassador) => any,
  sendToAdmin = false,
): Promise<{ accepted: any[]; rejected: any[] }> => {
  if (!(process.env.G_EMAIL && process.env.G_PASS))
    return Promise.resolve({ accepted: [], rejected: ['email is not configured'] })

  let emailSent
  let accepted = []
  let rejected = []
  const defaultEmailData = {
    host: 'eh?',
    subdomainIcon: '/images/BikeTag.svg',
  }

  for (const ambassador of ambassadors) {
    if (ambassador.email) {
      console.log(`sending ${emailName} email to BikeTag Ambassador: ${ambassador.email}`)
      emailSent = await sendEmail(
        ambassador.email,
        emailSubject,
        {
          ...defaultEmailData,
          ...getEmailData(ambassador),
        },
        emailName,
      )
      accepted = accepted.concat(emailSent.accepted)
      rejected = rejected.concat(emailSent.rejected)
    }
  }
  if (sendToAdmin) {
    const biketagAdminEmail = process.env.ADMIN_EMAIL ?? ''
    if (biketagAdminEmail?.length) {
      console.log(`sending ${emailName} email to BikeTag Administrator: ${biketagAdminEmail}`)
      emailSent = await sendEmail(
        biketagAdminEmail,
        emailSubject,
        {
          ...defaultEmailData,
          ...getEmailData({ id: biketagAdminEmail } as unknown as Ambassador),
        },
        emailName,
      )
      accepted = accepted.concat(emailSent.accepted)
      rejected = rejected.concat(emailSent.rejected)
    }
  }

  return { accepted, rejected }
}

export const getSanityImageUrl = (
  logo: string,
  size = '',
  sanityBaseCDNUrl = 'https://cdn.sanity.io/images/x37ikhvs/production/',
) => {
  const properFilePath = logo
    .replace('image-', '')
    .replace('-png', '.png')
    .replace('-jpg', '.jpg')
    .replace('-webp', '.webp')
  return `${sanityBaseCDNUrl}${properFilePath}${size.length ? `?${size}` : ''}`
}

export const archiveAndClearQueue = async (
  queuedTags: Tag[],
  game?: Game | null,
  adminBiketag?: BikeTagClient,
  nonAdminBikeTag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  const results: any = []
  let errors = false
  adminBiketag =
    adminBiketag ??
    new BikeTagClient(
      getBikeTagClientOpts({ method: 'get' } as unknown as request.Request, true, true),
    )
  if (!game) {
    const gameResponse = await adminBiketag.getGame(
      { game: queuedTags[0].game },
      { source: 'sanity' },
    )
    game = gameResponse.success ? gameResponse.data : null
  }
  if (queuedTags.length && game) {
    const nonAdminBikeTagOpts = getBikeTagClientOpts(undefined, true)
    const gameName = game.name.toLocaleLowerCase()
    console.log('archiving remaining queued tags', { game: gameName, queuedTags })
    nonAdminBikeTagOpts.game = gameName
    nonAdminBikeTagOpts.imgur.hash = game.queuehash

    if (!nonAdminBikeTag) {
      nonAdminBikeTag = nonAdminBikeTag ?? new BikeTagClient(nonAdminBikeTagOpts)
    } else {
      nonAdminBikeTag.config(nonAdminBikeTagOpts, false)
    }

    const currentBikeTag = (await adminBiketag.getTag({ limit: 1 })).data
    for (const nonWinningTag of queuedTags) {
      /// If there are remnants of tags from the currently posted biketag, don't archive them
      if (
        nonWinningTag.mysteryPlayer !== currentBikeTag?.mysteryPlayer &&
        nonWinningTag.foundPlayer !== currentBikeTag?.mysteryPlayer
      ) {
        /* Archive using ambassador credentials (mainhash and archivehash are both ambassador albums) */
        const archiveTagResult = await adminBiketag.archiveTag({
          ...nonWinningTag,
          archivehash: game.archivehash,
        })
        if (archiveTagResult.success) {
          results.push({
            message: 'non-winning found image archived',
            game: gameName,
            tag: nonWinningTag,
          })
        } else {
          // console.log({ archiveTagResult })
          results.push({
            message: 'error archiving non-winning found image',
            game: gameName,
            tag: nonWinningTag,
          })
          errors = true
        }
      }
      /* delete using player credentials (queuehash is player album) */
      const deleteArchivedTagFromQueueResult = await nonAdminBikeTag.deleteTag(nonWinningTag)
      if (deleteArchivedTagFromQueueResult.success) {
        results.push({
          message: 'non-winning tag deleted from queue',
          game: gameName,
          tag: nonWinningTag,
        })
      } else {
        // console.log({ deleteArchivedTagFromQueueResult })
        results.push({
          message: 'error deleting non-winning tag from the queue',
          game: gameName,
          tag: nonWinningTag,
        })
        /// No error here?
      }
    }
  }

  return {
    results,
    errors,
  }
}

export const getActiveQueueForGame = async (
  game: Game,
  adminBikeTag?: BikeTagClient,
  approvingAmbassador?: string,
): Promise<activeQueue> => {
  let queuedTags: Tag[] = []
  let completedTags: Tag[] = []
  let timedOutTags: Tag[] = []

  const autoPostSetting =
    game.settings && !!game.settings['queue::autoPost']
      ? parseInt(game.settings['queue::autoPost'])
      : 0
  /// TODO: check for the right ambassador here
  const approvingAmbassadorIsApproved = approvingAmbassador?.length

  // console.log({ autoPostSetting, game })
  if ((autoPostSetting && game.queuehash?.length) || approvingAmbassadorIsApproved) {
    /************** GET WINNING QUEUE *****************/
    adminBikeTag =
      adminBikeTag ??
      new BikeTagClient(
        getBikeTagClientOpts(
          {
            method: 'get',
          } as unknown as request.Request,
          true,
          true,
          game,
        ),
      )
    const getQueueResponse = await adminBikeTag.getQueue(undefined, {
      source: 'imgur',
    })
    queuedTags = getQueueResponse.success ? getQueueResponse.data : []
    if (queuedTags?.length) {
      completedTags = queuedTags.filter((t) => t.foundImageUrl?.length && t.mysteryImageUrl?.length)

      if (completedTags.length) {
        const now = Date.now()
        const tagAutoPostTimer = 1000 * 60 * autoPostSetting
        timedOutTags = completedTags.filter((t) => now - t.mysteryTime * 1000 > tagAutoPostTimer)

        if (timedOutTags.length) {
          const orderedTimedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
          timedOutTags = orderedTimedOutTags
        }
      }
    }
  }

  return {
    queuedTags,
    completedTags,
    timedOutTags,
  }
}

export const createBikeTagPlayerProfile = async (
  profile: any = {},
  game?: string,
  biketag?: BikeTagClient,
) => {
  profile = {
    ...profile,
    name: profile.user_metadata.name ?? profile.name,
  }
  if (profile.name?.length) {
    biketag = biketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true))
    if (game?.length) {
      profile.games = profile.games ?? [game]
    }
    console.log('creating new BikeTag Profile', profile)
    return biketag.updatePlayer(profile, { source: 'sanity' })
  } else {
    console.error('profile name not set, cannot create profile', profile)
  }
  return Promise.resolve({ data: null, success: false })
}

export const handleAuth0ProfileRequest = async (req, request, profile): Promise<any> => {
  let body = ''
  let statusCode = HttpStatusCode.Continue
  let options = {}
  const authorizationHeaders = await auth0Headers()
  const method = req.method ?? req.httpMethod

  switch (method) {
    case 'PUT':
      /// CREATE a new BikeTag profile fields (role, name)
      try {
        const data = JSON.parse(request)
        /// If the request is valid for an update
        if (isValidJson(data, 'profile.role')) {
          /// Happy path
          /// Get the roles for the profile
          const roles = (
            await axios.request({
              method: 'GET',
              url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}/roles`,
              headers: authorizationHeaders,
            })
          )?.data
          /// Get the metadata for the profile because we need to check if the name has been set (initialized)
          const user_data = (
            await axios.request({
              method: 'GET',
              url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}?fields=user_metadata`,
              headers: authorizationHeaders,
            })
          )?.data

          /// If the user has not been assigned a role nor username
          if (!roles.length || !user_data.user_metadata?.name) {
            /// Happy path
            // console.log('getting auth0 user by name', profile.sub, user_data, data)
            /// Verify that the user exists in Auth0
            const exists = (
              await axios.request({
                method: 'GET',
                url: `https://${process.env.A_DOMAIN}/api/v2/users`,
                params: {
                  page: 0,
                  per_page: 1,
                  include_totals: false,
                  fields: 'user_metadata.name',
                  q: `user_metadata.name:"${data.user_metadata?.name}"`,
                  search_engine: 'v3',
                },
                headers: authorizationHeaders,
              })
            )?.data
            if (!exists?.length) {
              /// Happy path
              /// Set the user role before setting the rest of the profile data
              // console.log('no BikeTag Profile found with that name', name)
              const roles = [
                profile.isBikeTagAmbassador ? process.env.AMBASSADOR_ROLE : process.env.PLAYER_ROLE,
              ]
              // console.log('setting roles for profile', profile.sub, roles)
              await axios.request({
                method: 'POST',
                url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}/roles`,
                headers: authorizationHeaders,
                data: { roles },
              })

              const biketagAdminOpts = getBikeTagClientOpts(req, true)

              /// Create the player profile in sanity
              console.log('creating the player in sanity', { data, biketagAdminOpts })
              const updatedPlayerResponse = await createBikeTagPlayerProfile(
                data,
                biketagAdminOpts.game,
                new BikeTagClient(biketagAdminOpts),
              )
              if (!updatedPlayerResponse.success) {
                console.error('Failed to create the player profile', updatedPlayerResponse)
              }

              /// CONTINUE to the request for initializing the BikeTag profile
              options = {
                method: 'PATCH',
                url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}`,
                headers: authorizationHeaders,
                data,
              }
            } else {
              body = ErrorMessage.NameTaken
              statusCode = HttpStatusCode.BadRequest
            }
          } else {
            /// Else, user has already been initialized, cannot initialize again (PUT)
            body = ErrorMessage.ProfileInitialized
            statusCode = HttpStatusCode.Forbidden
          }
        } else {
          /// Else the request is not a valid PUT for a player Profile
          body = ErrorMessage.InvalidRequestData
          statusCode = HttpStatusCode.BadRequest
        }
      } catch (e) {
        body = `${ErrorMessage.PatchFailed}: ${e.message ?? e}`
        statusCode = HttpStatusCode.BadRequest
      }
      break
    case 'PATCH':
      /// UPDATE a BikeTag profile
      try {
        const data = JSON.parse(request)
        /// WAIT WHY was this added? this needs to be in the request.
        // delete data.user_metadata?.name
        const profileType = profile.isBikeTagAmbassador
          ? 'profile.patch.ambassador'
          : 'profile.patch'
        const isValid = isValidJson(data, profileType)
        /// If the request is valid for a patch
        if (isValid) {
          /// CONTINUE to the request for updating the BikeTag profile
          options = {
            method: 'PATCH',
            url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}`,
            headers: authorizationHeaders,
            data,
          }
        } else {
          /// Invalid data
          console.log('data is not valid', data, profileType)
          body = ErrorMessage.InvalidRequestData
          statusCode = HttpStatusCode.BadRequest
        }
      } catch (e) {
        body = `${ErrorMessage.PatchFailed}: ${e.message ?? e}`
        statusCode = HttpStatusCode.BadRequest
      }
      break
    case 'GET':
      /// CONTINUE to the request for getting the BikeTag profile
      options = {
        method: 'GET',
        url: `https://${process.env.A_DOMAIN}/api/v2/users/${profile.sub}?fields=user_metadata`,
        headers: authorizationHeaders,
      }
      break
    default:
      body = ErrorMessage.MethodNotAllowed
      statusCode = HttpStatusCode.NotImplemented
  }

  if (statusCode == HttpStatusCode.Continue) {
    await axios
      .request(options)
      .then(function (response) {
        if (typeof response.data === 'string') {
          body = response.data
        } else if (Array.isArray(response.data)) {
          if (response.data?.length) console.log('well how did this happen?')
          body = ''
        } else {
          const profileDataResponse = profile.isBikeTagAmbassador
            ? constructAmbassadorProfile(response.data, profile)
            : constructPlayerProfile(response.data, profile)
          body = JSON.stringify(profileDataResponse)
        }
        statusCode = HttpStatusCode.Ok
      })
      .catch(function (error) {
        console.error(error.message)
        statusCode = HttpStatusCode.InternalServerError
        body = error.message
      })
  }

  return {
    statusCode,
    body,
  }
}

export const getBikeTagAuth0Profile = async (
  name,
  authorized = false,
  passcode?: string,
  sub?: string,
): Promise<any> => {
  const authorizationHeaders = await auth0Headers()
  const method = 'GET'
  const url = `https://${process.env.A_DOMAIN}/api/v2/users`
  const restrictUserMeta = !authorized || !passcode || !sub
  const params: any = {
    page: 0,
    per_page: 1,
    include_totals: false,
    fields: `${restrictUserMeta ? 'user_metadata.social,user_metadata.options' : 'user_metadata'}${
      authorized ? ',sub,user_metadata.name,user_metadata.passcode' : ''
    }`,
    q: `user_metadata.name:"${name}"`,
    search_engine: 'v3',
  }

  return axios
    .request({
      method,
      url,
      params,
      headers: authorizationHeaders,
    })
    .then(function (response) {
      if (response.status === HttpStatusCode.Ok) {
        const playerData = Array.isArray(response.data) ? response.data[0] : response.data

        if (authorized && passcode) {
          if (playerData.user_metadata?.passcode !== passcode) {
            return {
              status: HttpStatusCode.Unauthorized,
              data: 'passcode does not match',
            }
          }
        }

        return {
          status: HttpStatusCode.Ok,
          data: playerData,
        }
      }
      return {
        status: response.status,
        data: response.data,
      }
    })
}

export const getBikeTagPlayerProfile = async (
  profile,
  authorized = false,
  stringifyResponse = false,
  adminBikeTag?: BikeTagClient,
): Promise<any> => {
  adminBikeTag =
    adminBikeTag ?? new BikeTagClient(getBikeTagClientOpts(undefined, authorized, false))
  const playerProfileResult = await adminBikeTag.getPlayer(
    profile.user_metadata?.name ?? profile.name,
    {
      source: 'sanity',
    },
  )
  const playerProfile = playerProfileResult.success ? playerProfileResult.data : {}
  const mergedProfile = { ...profile, ...playerProfile }

  return stringifyResponse ? JSON.stringify(mergedProfile) : mergedProfile
}

export const sendBikeTagPostNotificationToWebhook = (
  currentTag: Tag,
  winningTag: Tag,
  webhook: string,
  type: string,
  host: string,
  game: Game,
) => {
  const currentNumber = currentTag.tagnumber
  const winningTagnumber = winningTag.tagnumber
  const heading = `A new BikeTag has been posted for the [${game.name}](${host}) game!`
  const headingSlack = `A new BikeTag has been posted for the <${host}|${game.name}> game!`
  const title = `BikeTag #${winningTagnumber} by ${winningTag.mysteryPlayer}`
  const hint = `Hint: ||${winningTag.hint}||`
  const previousDescription = `[Previous round](${host}/${currentNumber}) found at ${currentTag.foundLocation} by ${currentTag.foundPlayer}`
  const previousDescriptionSlack = `<${host}/${currentNumber}|Previous round> found at ${currentTag.foundLocation} by ${currentTag.foundPlayer}`
  const mysteryAltText = `BikeTag #${winningTagnumber} by ${winningTag.mysteryPlayer}`
  const foundAltText = `BikeTag #${currentNumber} found by ${currentTag.foundPlayer}`
  const timestamp = getTagDate(currentTag.foundTime).toISOString()
  const mysteryImageUrl = getImgurImageSized(winningTag.mysteryImageUrl, 'l')
  const foundImageUrl = getImgurImageSized(currentTag.foundImageUrl, 'l')

  let data = {}
  switch (type) {
    case 'discord':
      // https://discord.com/developers/docs/resources/webhook
      data = JSON.stringify({
        content: heading,
        embeds: [
          {
            title,
            description: `${hint}\n\n\t\t${previousDescription}`,
            timestamp,
            image: {
              url: winningTag.mysteryImageUrl,
            },
            thumbnail: {
              url: currentTag.foundImageUrl,
            },
          },
        ],
      })
      break
    case 'slack':
      data = JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: headingSlack,
            },
          },
          {
            type: 'image',
            title: {
              type: 'plain_text',
              text: mysteryAltText,
              emoji: true,
            },
            image_url: mysteryImageUrl,
            alt_text: mysteryAltText,
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: previousDescriptionSlack,
            },
            accessory: {
              type: 'image',
              image_url: foundImageUrl,
              alt_text: foundAltText,
            },
          },
        ],
      })
      break
    default:
      return
  }

  return axios({
    method: 'post',
    url: webhook,
    headers: {
      'Content-Type': 'application/json',
    },
    data,
  }).then((response) => `${type}::${response.status}`)
}

export const sendNewBikeTagNotifications = async (
  game: Game,
  currentTag: Tag,
  winningTag: Tag,
  adminBiketag?: BikeTagClient,
) => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))

  const notificationPromises: any = []
  const ambassadors = (await adminBiketag.ambassadors(undefined, {
    source: 'sanity',
  })) as Ambassador[]
  const thisGamesAmbassadors = ambassadors.filter((a) => game.ambassadors.indexOf(a.name) !== -1)
  const winningTagnumber = winningTag.tagnumber
  const host = `https://${game.name}.biketag.org`
  const logo = game.logo?.length
    ? game.logo.indexOf('imgur.co') !== -1
      ? game.logo
      : getSanityImageUrl(game.logo)
    : `${host}${defaultLogo}`

  const sendGlobalDiscordNotification = process.env.DCN
  if (sendGlobalDiscordNotification) {
    // console.log({ sendGlobalDiscordNotification })
    notificationPromises.push(
      sendBikeTagPostNotificationToWebhook(
        currentTag,
        winningTag,
        sendGlobalDiscordNotification,
        'discord',
        host,
        game,
      ),
    )
  }

  const sendGlobalSlackNotification = process.env.SLN
  if (sendGlobalSlackNotification) {
    // console.log({ sendGlobalSlackNotification })
    notificationPromises.push(
      sendBikeTagPostNotificationToWebhook(
        currentTag,
        winningTag,
        sendGlobalSlackNotification,
        'slack',
        host,
        game,
      ),
    )
  }

  const sendDiscordNotification = game.settings['notifications::discord']
  if (sendDiscordNotification) {
    // console.log({ sendDiscordNotification })
    notificationPromises.push(
      sendBikeTagPostNotificationToWebhook(
        currentTag,
        winningTag,
        sendDiscordNotification,
        'discord',
        host,
        game,
      ),
    )
  }

  const sendSlackNotification = game.settings['notifications::slack']
  if (sendSlackNotification) {
    // console.log({ sendSlackNotification })
    notificationPromises.push(
      sendBikeTagPostNotificationToWebhook(
        currentTag,
        winningTag,
        sendSlackNotification,
        'slack',
        host,
        game,
      ),
    )
  }

  // console.log('emailing', { thisGamesAmbassadors })
  notificationPromises.push(
    sendEmailsToAmbassadors(
      'biketag-auto-posted',
      `New BikeTag Round (#${winningTagnumber}) Auto-Posted for [${game.name}]`,
      thisGamesAmbassadors,
      (a) => {
        return {
          currentBikeTag: currentTag,
          newBikeTagPost: winningTag,
          logo,
          ambassadorsUrl: `${host}/queue?btaId=${a?.id}`,
          tagAutoApprovedText:
            'This tag was auto-approved by the AutoPost feature for being the first, completed, BikeTag Post to be submitted. If there is a problem with this tag, please click the button below to address the issue.',
          newBikeTagRoundTitle: ``,
          newBikeTagRoundText: `BikeTag Round #${winningTagnumber} was just auto-posted!`,
          tosText: 'Terms & Conditions',
          replyToRemoveLink:
            'reply to this email to request that these emails no longer be sent to you',
          newBikeTagRoundFooter: 'Thank you for being a BikeTag Ambassador!',
          btaDashboardButton: 'BikeTag Ambassador dashboard',
          host,
          game: game.name,
          redditLink: `https://reddit.com/r/${game.subreddit?.length ? game.subreddit : 'biketag'}`,
          twitterLink: `https://twitter.com/${game.twitter?.length ? game.twitter : 'biketag'}`,
        }
      },
    ).then((results) => {
      return results.accepted.concat(results.rejected)
    }),
  )

  return notificationPromises
}

/**
 * Sets a new BikeTag post by updating the current BikeTag with the winning tag information
 * and posting the new BikeTag from the queue.
 *
 * @param game - The game object.
 * @param winningBikeTagPost - The winning BikeTag post.
 * @param previousBikeTag - The previous BikeTag post.
 * @returns A promise that resolves to the background process results.
 */
export const setNewBikeTagPost = async (
  game: Game,
  winningBikeTagPost: Tag,
  previousBikeTag: Tag,
  adminBiketag?: BikeTagClient,
  nonAdminBiketag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))
  /// Get the current BikeTag
  previousBikeTag = previousBikeTag ?? ((await adminBiketag.getTag()).data as Tag) // the "current" mystery tag to be updated
  let errors = false
  const results: any = []

  /// Create the new BikeTag to be posted from the mystery information of the winning BikeTag
  const newBikeTagPost = BikeTagClient.getters.getOnlyMysteryTagFromTagData(winningBikeTagPost) // the new "current" mystery tag

  try {
    /************** UPDATE CURRENT BIKETAG WITH FOUND IMAGE *****************/
    /// Zero out the gps for the new location, as the GPS of a newly posted tag is the current/previous tag found location
    newBikeTagPost.gps = { lat: 0, long: 0, alt: 0 }
    /// Update the current BikeTag with the winning tag found information
    previousBikeTag.gps = winningBikeTagPost.gps
    previousBikeTag.foundImageUrl = winningBikeTagPost.foundImageUrl
    previousBikeTag.foundTime = winningBikeTagPost.foundTime
    previousBikeTag.foundLocation = winningBikeTagPost.foundLocation
    previousBikeTag.foundPlayer = winningBikeTagPost.foundPlayer
    // console.log('updating current BikeTag with the winning tag found information', previousBikeTag)
    const currentBikeTagUpdateResult = await adminBiketag.updateTag(previousBikeTag)

    if (currentBikeTagUpdateResult.success) {
      results.push({
        message: 'current BikeTag updated',
        game: game.name,
        tag: previousBikeTag,
      })
    } else {
      results.push({
        message: 'current BikeTag was not updated',
        error: currentBikeTagUpdateResult.error,
        game: game.name,
        tag: previousBikeTag,
      })
      errors = true
    }

    /************** SET NEW BIKETAG POST FROM QUEUE *****************/
    const newBikeTagUpdateResult = await adminBiketag.updateTag(newBikeTagPost)
    if (newBikeTagUpdateResult.success) {
      results.push({
        message: 'new BikeTag posted',
        game: game.name,
        tag: newBikeTagUpdateResult.data,
      })
    } else {
      results.push({
        message: 'new BikeTag was not posted',
        error: newBikeTagUpdateResult.error,
        game: game.name,
        tag: newBikeTagPost,
      })
      errors = true
    }

    if (currentBikeTagUpdateResult.success && newBikeTagUpdateResult.success) {
      /************** SEND NOTIFICATIONS *****************/
      /// Send it off and hope that it finishes
      // console.log('sending notifications', getApiUrl(game.name, 'autopost-notify'))
      axios({
        method: 'post',
        url: getApiUrl(game.name, 'autopost-notify'),
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((e) => {
        console.log('error sending notifications', e.message ?? e)
      })

      /************** REMOVE NEWLY POSTED BIKETAG FROM QUEUE *****************/
      const nonAdminBikeTagOpts = getBikeTagClientOpts(undefined, true)
      nonAdminBikeTagOpts.game = game.name.toLocaleLowerCase()
      nonAdminBikeTagOpts.imgur.hash = game.queuehash
      if (!nonAdminBiketag) {
        nonAdminBiketag = new BikeTagClient(nonAdminBikeTagOpts)
      } else {
        nonAdminBiketag.config(nonAdminBikeTagOpts)
      }
      // console.log({ config: nonAdminBikeTag.config() })

      const deleteWinningTagFromQueueResult = await nonAdminBiketag.deleteTag(winningBikeTagPost)
      if (deleteWinningTagFromQueueResult.success) {
        results.push({
          message: 'winning tag deleted from queue',
          game: game.name,
          tag: winningBikeTagPost,
        })
      } else {
        // console.log({ deleteQueuedTagResult: deleteWinningTagFromQueueResult })
        results.push({
          message: 'error deleting winning tag from queue',
          game: game.name,
          tag: winningBikeTagPost,
        })
        errors = true
      }

      /************** REMOVE REMAINING BIKETAGS FROM QUEUE *****************/
      /// Send it off and hope that it finishes
      axios({
        method: 'post',
        url: getApiUrl(game.name, 'autopost-clear'),
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((e) => {
        console.log('error clearing queue', e.message ?? e)
      })
    }
  } catch (e) {
    results.push({
      message: 'error setting new BikeTag Post',
      error: e?.message ?? e,
      game: game.name,
      current: previousBikeTag,
      tag: newBikeTagPost,
    })
    errors = true
  }

  return {
    results,
    errors,
  }
}

export const getWinningTagForCurrentRound = (
  timedOutTags: Tag[],
  currentBikeTag: Tag,
): Tag | undefined => {
  if (timedOutTags.length) {
    const orderedTimedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
    const winnerWinnerChickenDinner = orderedTimedOutTags[0] // the "first" completed tag in the queue

    if (currentBikeTag.tagnumber === winnerWinnerChickenDinner.tagnumber - 1) {
      return winnerWinnerChickenDinner
    }
  }
  return undefined
}

const getAuthManagementToken = async () => {
  try {
    const getManagementTokenRequest = await axios({
      method: 'POST',
      url: `https://${process.env.A_DOMAIN}/oauth/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.A_M_CID,
        client_secret: process.env.A_M_CS,
        audience: process.env.A_AUDIENCE,
      }),
    })
    return getManagementTokenRequest?.data?.access_token
  } catch (e) {
    // console.log({
    //   domain: process.env.A_DOMAIN,
    //   client_id: process.env.A_M_CID,
    //   client_secret: process.env.A_M_CS,
    //   audience: process.env.A_AUDIENCE,
    // })
    console.log('getAuthManagementToken error', e.message)
  }
}

export const auth0Headers = async () => {
  const accessToken = (await isAuthenticationEnabled()) ? await getAuthManagementToken() : null
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }

  return {}
}

export const acceptCorsHeaders = () => ({
  Accept: '*',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '8640',
})

export const constructAmbassadorProfile = (
  profile: any = {},
  defaults: any = {},
): BikeTagProfile => {
  const user_metadata = {
    name: profile?.user_metadata?.name ?? defaults?.user_metadata?.name ?? '',
    passcode: profile?.user_metadata?.passcode ?? defaults?.user_metadata?.passcode ?? '',
    social: {
      reddit:
        profile?.user_metadata?.social?.reddit ?? defaults?.user_metadata?.social?.reddit ?? '',
      instagram:
        profile?.user_metadata?.social?.instagram ??
        defaults?.user_metadata?.social?.instagram ??
        '',
      twitter:
        profile?.user_metadata?.social?.twitter ?? defaults?.user_metadata?.social?.twitter ?? '',
      imgur: profile?.user_metadata?.social?.imgur ?? defaults?.user_metadata?.social?.imgur ?? '',
      discord:
        profile?.user_metadata?.social?.discord ?? defaults?.user_metadata?.social?.discord ?? '',
    },
    credentials: {
      imgur: {
        clientId:
          profile?.user_metadata?.credentials?.imgur.clientId ??
          defaults?.user_metadata?.credentials?.imgur.clientId ??
          '',
        clientSecret:
          profile?.user_metadata?.credentials?.imgur.clientSecret ??
          defaults?.user_metadata?.credentials?.imgur.clientSecret ??
          '',
        refreshToken:
          profile?.user_metadata?.credentials?.imgur.refreshToken ??
          defaults?.user_metadata?.credentials?.imgur.refreshToken ??
          '',
      },
      sanity: {
        projectId:
          profile?.user_metadata?.credentials?.sanity.projectId ??
          defaults?.user_metadata?.credentials?.sanity.projectId ??
          '',
        dataset:
          profile?.user_metadata?.credentials?.sanity.dataset ??
          defaults?.user_metadata?.credentials?.sanity.dataset ??
          '',
      },
      reddit: {
        clientId:
          profile?.user_metadata?.credentials?.reddit.clientId ??
          defaults?.user_metadata?.credentials?.reddit.clientId ??
          '',
        clientSecret:
          profile?.user_metadata?.credentials?.reddit.clientSecret ??
          defaults?.user_metadata?.credentials?.reddit.clientSecret ??
          '',
        username:
          profile?.user_metadata?.credentials?.reddit.username ??
          defaults?.user_metadata?.credentials?.reddit.username ??
          '',
        password:
          profile?.user_metadata?.credentials?.reddit.password ??
          defaults?.user_metadata?.credentials?.reddit.password ??
          '',
      },
    },
    options: {
      skipSteps:
        profile?.user_metadata?.options?.skipSteps ??
        defaults?.user_metadata?.options?.skipSteps ??
        false,
    },
  }
  return {
    name: user_metadata.name ?? defaults.name ?? '',
    sub: profile.sub ?? defaults.sub ?? '',
    slug: profile.slug ?? defaults.slug ?? '',
    address1: profile.address1 ?? defaults.address1 ?? '',
    address2: profile.address2 ?? defaults.address2 ?? '',
    city: profile.city ?? defaults.city ?? '',
    country: profile.country ?? defaults.country ?? '',
    email: profile.email ?? defaults.email ?? '',
    isBikeTagAmbassador: profile.isBikeTagAmbassador ?? defaults?.isBikeTagAmbassador ?? false,
    locale: profile.locale ?? defaults.locale ?? '',
    nonce: profile.nonce ?? defaults.nonce ?? '',
    phone: profile.phone ?? defaults.phone ?? '',
    picture: profile.picture ?? defaults.picture ?? '',
    user_metadata,
    zipcode: profile.zipcode ?? defaults.zipcode ?? '',
  }
}

export const constructPlayerProfile = (profile: any = {}, defaults: any = {}): BikeTagProfile => {
  const user_metadata = {
    name: profile?.user_metadata?.name ?? defaults?.user_metadata?.name ?? '',
    social: {
      reddit: profile?.user_metadata?.reddit ?? defaults?.user_metadata?.reddit ?? '',
      instagram: profile?.user_metadata?.instagram ?? defaults?.user_metadata?.instagram ?? '',
      twitter: profile?.user_metadata?.twitter ?? defaults?.user_metadata?.twitter ?? '',
      imgur: profile?.user_metadata?.imgur ?? defaults?.user_metadata?.imgur ?? '',
      discord: profile?.user_metadata?.discord ?? defaults?.user_metadata?.discord ?? '',
    },
    options: {
      skipSteps:
        profile?.user_metadata?.options?.skipSteps ??
        defaults?.user_metadata?.options?.skipSteps ??
        false,
    },
  }
  return {
    name: user_metadata.name ?? defaults.name ?? '',
    sub: profile.sub ?? defaults.sub ?? '',
    slug: profile.slug ?? defaults.slug ?? '',
    email: profile.email ?? defaults.email ?? '',
    locale: profile.locale ?? defaults.locale ?? '',
    nonce: profile.nonce ?? defaults.nonce ?? '',
    picture: profile.picture ?? defaults.picture ?? '',
    user_metadata,
    zipcode: profile.zipcode ?? defaults.zipcode ?? '',
  } as BikeTagProfile
}

export const getEnvironmentVariable = (key: string) => {
  if (process.env[key]) {
    return decompress(process.env[key], { inputEncoding: 'Base64' })
  }
}
