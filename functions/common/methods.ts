import { AtpAgent } from '@atproto/api'
import { JwtVerifier, getTokenFromHeader } from '@serverless-jwt/jwt-verifier'
import Ajv from 'ajv'
import axios from 'axios'
import type { Ambassador, Game, Tag } from 'biketag'
import BikeTagClient from 'biketag'
import crypto from 'crypto'
import CryptoJS from 'crypto-js'
import { readFileSync } from 'fs'
import * as jose from 'jose'
import { Liquid } from 'liquidjs'
import lzutf8 from 'lzutf8'
import nodemailer from 'nodemailer'
import { extname, join } from 'path'
import qs from 'qs'
import {
  getDomainInfo,
  getImageSized,
  getTagDateISOFromTimezone,
  isAuthenticationEnabled,
} from '../../src/common'
import { BikeTagProfile } from '../../src/common/types'
import { ErrorMessage, HttpStatusCode, JSONModels } from './constants'
import { BackgroundProcessResults, activeQueue } from './types'

const ajv = new Ajv()

let log: (message: string, data?: any, level?: 'info' | 'warn' | 'error') => void

if (process.env.DEBUG_A === 'true') {
  log = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
    console[level](message, data)
  }
} else {
  log = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
    if (level === 'warn' || level === 'error') {
      console[level](message, data)
    }
  }
}

export { log }

export const getApiUrl = (game = '', path = ''): string => {
  return process.env.CONTEXT === 'dev'
    ? `http://${game.length ? `${game}.` : ''}${process.env.HOST}:7200/.netlify/functions/${path}`
    : `https://${game.length ? `${game}.` : ''}${process.env.HOST}/api/${path}`
}

export const isRequestAllowed = (
  req: any,
  authorized?: boolean,
  admin?: boolean,
  isFrontendRequest?: boolean,
  restrictMethod?: string[] | string,
): boolean => {
  if (restrictMethod?.length) {
    const restrictMethods = typeof restrictMethod === 'string' ? [restrictMethod] : restrictMethod
    if (restrictMethods!.indexOf(req.method.toLowerCase()) === -1) {
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

    return req.headers?.get('referrer')?.includes(process.env.HOST)
  }

  return false
}

export const getBikeTagClientOpts = (
  req?: Request,
  authorized?: boolean,
  admin?: boolean,
  game?: Game,
) => {
  const funcRequest = req ?? { method: 'GET' }
  const domainInfo = getDomainInfo(funcRequest)
  const isAuthenticatedPOST = funcRequest?.method === 'POST' || authorized
  const isGET = !isAuthenticatedPOST && funcRequest?.method === 'GET'

  /// The minimum to load a BikeTag Game in Read-Only mode
  const opts: any = {
    game:
      game?.name?.toLocaleLowerCase() ??
      game?.slug ??
      domainInfo.subdomain ??
      process.env.GAME_NAME,
    cached: isGET || !isAuthenticatedPOST,
    // biketag: {
    clientKey: process.env.B_KEY,
    // },
    aws: {
      region: game?.awsRegion,
    },
    imgur: {
      clientId: process.env.I_CID,
      hash: game?.mainhash,
      queuehash: game?.queuehash,
      archivehash: game?.archivehash,
      rapidApiKey: process.env.RA_BE_KEY,
    },
    sanity: {
      projectId: process.env.S_PID,
      dataset: process.env.S_DSET,
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

    /// Enables aws uploads and edits
    opts.aws = {
      accessKeyId: process.env.S3_BE_ACCESS_ID,
      secretAccessKey: process.env.S3_BE_ACCESS_KEY,
    }

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

export const parseQuery = (req: Request) => {
  const params: any = new URL(req.url).searchParams ?? []
  return Object.fromEntries(params)
}

export const parseBody = async (req: Request) => {
  let parsed = {}
  try {
    parsed = await req.json()
    if (!parsed) {
      parsed = parseQuery(req)
    }
  } catch (e: any) {
    parsed = parseQuery(req)
  }

  return parsed
}

export const getPayloadOpts = async (req: any, base = {}): Promise<any> => {
  const parsedQuery = parseQuery(req)
  const parsedBody = await parseBody(req)
  return {
    ...base,
    ...parsedQuery,
    ...parsedBody,
  }
}

export const isValidJson = (data = {}, type = 'none') => {
  let schema = {}

  switch (type) {
    case JSONModels.ProfilePatchPlayer:
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
                  bluesky: { type: 'string' },
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
    case JSONModels.ProfilePatchAmbassador:
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
                  bluesky: { type: 'string' },
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
    case JSONModels.ProfilePut:
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
  return (handler: any) => async (req: Request, context: any, cb: any) => {
    let claims
    let clientToken

    try {
      clientToken = getTokenFromHeader(req.headers.get('authorization') as string)
      claims = await verifier.verifyAccessToken(clientToken)
    } catch (err: any) {
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
      token: clientToken,
      claims,
    }
    context.identityContext = ctx

    // Continue.
    return handler(req, context, cb)
  }
}

export const getThisGamesAmbassadors = async (client: BikeTagClient, adminBikeTagOpts?: any) => {
  if (!client) {
    adminBikeTagOpts =
      adminBikeTagOpts ??
      getBikeTagClientOpts(
        {
          method: 'get',
        } as Request,
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

export const getProfileAuthorization = async (req: Request): Promise<any> => {
  const authorization = await getPayloadAuthorization(req)
  let profile: any = authorization?.isValid ? authorization.profile : null

  if (authorization?.isValid && profile) {
    log('Valid authorization received for profile', { email: profile.email }, 'info')

    const adminBiketagOpts = getBikeTagClientOpts(req, true, true)
    const adminBiketag = new BikeTagClient(adminBiketagOpts)
    const thisGamesAmbassadors = (await getThisGamesAmbassadors(adminBiketag, {
      source: 'sanity',
    })) as Ambassador[]
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
      log('Profile marked as BikeTagAmbassador', { email: profile.email }, 'info')
    }
  }

  return profile
}

export const getPayloadAuthorization = async (
  req: any,
): Promise<{
  type: 'jwt' | 'basic' | 'client' | 'bearer' | null
  token?: string
  isValid: boolean
  reason?: 'expired' | 'invalid' | null
  profile?: any
}> => {
  let authorizationString = req.headers.get('authorization')
  const basic = 'Basic '
  const bearer = 'Bearer '
  const jwt = 'JWT '
  const client = 'Client-ID '
  let authProfile: any = {}

  const authorizationType: string | null = authorizationString?.startsWith(basic)
    ? 'basic'
    : authorizationString?.startsWith(client)
      ? 'client'
      : authorizationString?.startsWith(bearer)
        ? 'bearer'
        : authorizationString?.startsWith(jwt)
          ? 'jwt'
          : null

  const getBasicAuthProfile = (authStr: string) => {
    try {
      const decrypted = CryptoJS.AES.decrypt(authStr, process.env.HOST_KEY ?? '')
      const decoded = decrypted.toString(CryptoJS.enc.Utf8)
      if (decoded) {
        const [name, passcode] = decoded.split('::')
        return { name, passcode }
      }
    } catch (e: any) {
      log('Error decrypting Basic auth string', e, 'warn')
    }
    return { name: null, passcode: null }
  }

  const getNetlifyAuthProfile = async (authStr: string) => {
    try {
      const verifierOpts = { issuer: '', audience: '' }
      const verifier = new JwtVerifier(verifierOpts)
      return await validateJWT(verifier, verifierOpts)
    } catch (e: any) {
      log('Error verifying Netlify JWT', e, 'warn')
    }
    return null
  }

  const getAuth0AuthProfile = async (authStr: string) => {
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${process.env.A_DOMAIN}/.well-known/jwks.json`),
      )
      const { payload } = await jose.jwtVerify(authStr, JWKS)
      return payload
    } catch (e: any) {
      if (e.code === 'ERR_JWT_EXPIRED') return null
      log('Auth0 JWT verification error', e, 'warn')
      return authStr
    }
  }

  const getBikeTagAuthorization = async (
    token: string,
  ): Promise<{
    isValid: boolean
    reason: 'expired' | 'invalid' | null
    profile: { client_id: string; p_id: string } | null
  }> => {
    const jwtSecretKey = process.env.HOST_KEY
      ? crypto.createHash('sha256').update(process.env.HOST_KEY).digest()
      : null

    if (!jwtSecretKey) {
      log('JWT verification failed: HOST_KEY missing', null, 'error')
      return { isValid: false, reason: 'invalid', profile: null }
    }

    try {
      const { payload } = await jose.jwtVerify(token, jwtSecretKey)
      return {
        isValid: true,
        reason: null,
        profile: payload as { client_id: string; p_id: string },
      }
    } catch (err: any) {
      log('BikeTag JWT verification failed', err, 'warn')
      const reason = err.code === 'ERR_JWT_EXPIRED' ? 'expired' : 'invalid'
      return { isValid: false, reason, profile: null }
    }
  }

  switch (authorizationType) {
    case 'basic': {
      authorizationString = authorizationString.substring(basic.length)
      const basicProfile = await getBasicAuthProfile(authorizationString)
      authProfile = {
        type: 'basic',
        isValid: !!basicProfile.name && !!basicProfile.passcode,
        profile: basicProfile,
      }
      break
    }
    case 'netlify': {
      authorizationString = authorizationString.substring(client.length)
      const netlifyProfile = await getNetlifyAuthProfile(authorizationString)
      authProfile = {
        type: 'netlify',
        isValid: !!netlifyProfile,
        profile: netlifyProfile,
      }
      break
    }
    case 'client': {
      authorizationString = authorizationString.substring(client.length)
      const clientProfile = await getAuth0AuthProfile(authorizationString)
      authProfile = {
        type: 'client',
        isValid: !!clientProfile,
        profile: clientProfile,
      }
      break
    }
    case 'bearer': {
      authorizationString = authorizationString.substring(bearer.length)
      const bearerProfile = await getAuth0AuthProfile(authorizationString)
      authProfile = {
        type: 'bearer',
        isValid: !!bearerProfile,
        profile: bearerProfile,
      }
      break
    }
    case 'jwt': {
      authorizationString = authorizationString.substring(jwt.length)
      const biketagAuthProfile = await getBikeTagAuthorization(authorizationString)
      authProfile = {
        type: 'jwt',
        token: authorizationString,
        isValid: biketagAuthProfile.isValid,
        reason: biketagAuthProfile.reason,
        profile: biketagAuthProfile.profile,
      }
      break
    }
    default: {
      authProfile = {
        type: null,
        isValid: false,
        reason: 'unsupported',
        profile: authorizationString?.length ? ErrorMessage.AuthTypeNotSupported : null,
      }
      break
    }
  }

  log(
    'Authorization resolved',
    {
      originalAuthorization: req.headers.get('authorization'),
      authorizationType,
      authProfile,
    },
    'info',
  )

  return authProfile
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
  } catch (e: any) {
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
  } catch (e: any) {
    /// swallow exception
    // console.log(e)
    return null
  }
}

export const compress = lzutf8.compress
export const decompress = lzutf8.decompress

let liquidInstance: Liquid
export const liquidOpts: any = {
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

  Object.keys(liquidOpts.customFilters).forEach((filter: string) => {
    const filterMethod: any = liquidOpts.customFilters[filter]
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
  } catch (e: any) {
    console.error(ErrorMessage.sendEmail, { e })
  }

  if (!html.length) {
    console.log(ErrorMessage.NoHtmlLoaded, { templateFilePath, htmlTemplateFilePath })
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
    return Promise.resolve({ accepted: [], rejected: [ErrorMessage.EmailNotConfigured] })
  let emailSent
  let accepted: any = []
  let rejected: any = []
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
      accepted = accepted.concat(emailSent?.accepted ?? [])
      rejected = rejected.concat(emailSent?.rejected ?? [])
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
      accepted = accepted.concat(emailSent?.accepted ?? [])
      rejected = rejected.concat(emailSent?.rejected ?? [])
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
  game?: Game | undefined,
  adminBiketag?: BikeTagClient,
  nonAdminBikeTag?: BikeTagClient,
  noArchive = false,
): Promise<BackgroundProcessResults> => {
  const results: any = []
  let errors = false
  adminBiketag =
    adminBiketag ??
    new BikeTagClient(getBikeTagClientOpts({ method: 'get' } as Request, true, true, game))

  if (!game) {
    const gameResponse = await adminBiketag.getGame(
      { game: queuedTags[0].game },
      { source: 'sanity' },
    )
    game = gameResponse.success ? gameResponse.data : undefined
  }
  const imageSource = game?.awsRegion ? 'aws' : 'imgur'

  if (queuedTags.length && game) {
    const nonAdminBikeTagOpts = getBikeTagClientOpts(undefined, true, false, game)
    const gameName = game.name.toLowerCase()

    if (!nonAdminBikeTag) {
      nonAdminBikeTag = new BikeTagClient(nonAdminBikeTagOpts)
    } else {
      nonAdminBikeTag.config(nonAdminBikeTagOpts, false, true)
    }

    if (!noArchive) {
      log(
        'Archiving remaining queued tags',
        { game: gameName, queuedTagsCount: queuedTags.length },
        'info',
      )

      const currentBikeTag = (await adminBiketag.getTag({ limit: 1 }, { source: imageSource })).data
      for (const nonWinningTag of queuedTags) {
        if (
          nonWinningTag.mysteryPlayer !== currentBikeTag?.mysteryPlayer &&
          nonWinningTag.foundPlayer !== currentBikeTag?.mysteryPlayer
        ) {
          const archiveTagResult = await adminBiketag.archiveTag(
            { ...nonWinningTag, archivehash: game.archivehash },
            { source: imageSource },
          )
          if (archiveTagResult.success) {
            results.push({
              message: 'non-winning found image archived',
              game: gameName,
              tag: nonWinningTag,
            })
          } else {
            log('Failed to archive non-winning tag', archiveTagResult, 'warn')
            results.push({
              message: ErrorMessage.NonWinningTagNotArchived,
              game: gameName,
              tag: nonWinningTag,
            })
            errors = true
          }
        }

        const deleteArchivedTagFromQueueResult = await nonAdminBikeTag.deleteTag(nonWinningTag, {
          source: imageSource,
        })
        if (deleteArchivedTagFromQueueResult.success) {
          results.push({
            message: 'non-winning tag deleted from queue',
            game: gameName,
            tag: nonWinningTag,
          })
        } else {
          log(
            'Failed to delete non-winning tag from queue',
            deleteArchivedTagFromQueueResult,
            'warn',
          )
          results.push({
            message: ErrorMessage.NonWinningTagNotDeleted,
            game: gameName,
            tag: nonWinningTag,
          })
        }
      }
    } else {
      for (const queuedTag of queuedTags) {
        const deletedTagResult = await nonAdminBikeTag.deleteTag(queuedTag, { source: imageSource })
        results.push({
          message: deletedTagResult.success
            ? 'tag deleted from queue'
            : ErrorMessage.QueuedTagNotDeleted,
          game: gameName,
          tag: queuedTag,
        })
      }
    }
  } else {
    errors = true
    results.push({ message: ErrorMessage.GameNotSet, game: undefined })
  }

  return { results, errors }
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

  const approvingAmbassadorIsApproved = !!approvingAmbassador?.length
  const imageSource = game.awsRegion ? 'aws' : 'imgur'

  log('Evaluating active queue for game', { game: game.name, autoPostSetting, imageSource }, 'info')

  if ((autoPostSetting && game.queuehash?.length) || approvingAmbassadorIsApproved) {
    adminBikeTag =
      adminBikeTag ??
      new BikeTagClient(getBikeTagClientOpts({ method: 'get' } as Request, true, true, game))
    const getQueueResponse = await adminBikeTag.getQueue(undefined, { source: imageSource })
    queuedTags = getQueueResponse.success ? getQueueResponse.data : []

    if (queuedTags.length) {
      completedTags = queuedTags.filter((t) => t.foundImageUrl?.length && t.mysteryImageUrl?.length)

      if (completedTags.length) {
        const now = Date.now()
        const tagAutoPostTimer = 1000 * 60 * autoPostSetting
        log(
          'Checking for timed-out tags',
          { now, tagAutoPostTimer, completedTagsCount: completedTags.length },
          'info',
        )

        timedOutTags = completedTags.filter((t) => {
          const diff = now - t.mysteryTime * 1000
          const isTimedOut = diff > tagAutoPostTimer
          if (isTimedOut) {
            log('Tag timed out', { tagnumber: t.tagnumber, diff }, 'info')
          }
          return isTimedOut
        })

        if (timedOutTags.length) {
          timedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
        }
      }
    }
  }

  return { queuedTags, completedTags, timedOutTags }
}

export const createBikeTagPlayerProfile = async (
  profile: any = {},
  game?: string,
  biketag?: BikeTagClient,
) => {
  profile = { ...profile, name: profile?.user_metadata?.name ?? profile.name }
  if (profile?.name?.length) {
    biketag = biketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true))
    if (game?.length) {
      profile.games = profile.games ?? [game]
    }
    log('Creating new BikeTag profile', { name: profile.name, game }, 'info')
    return biketag.updatePlayer(profile, { source: 'sanity' })
  } else {
    log(ErrorMessage.ProfileNameNotSet, profile, 'error')
  }
  return Promise.resolve({ data: null, success: false })
}

export const handleAuth0ProfileRequest = async (req: Request, profile: any): Promise<any> => {
  let body = ''
  let statusCode = HttpStatusCode.Continue
  let options = {}
  const authorizationHeaders = await auth0Headers()
  const method = req.method ?? req.method

  switch (method) {
    case 'PUT':
      /// CREATE a new BikeTag profile fields (role, name)
      try {
        const data = await req.json()
        const userMetadata = data.user_metadata
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
                  q: `user_metadata.name:"${userMetadata?.name}"`,
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
                console.error(ErrorMessage.PlayerNotCreated, updatedPlayerResponse)
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
      } catch (e: any) {
        body = `${ErrorMessage.PatchFailed}: ${e.message ?? e}`
        statusCode = HttpStatusCode.BadRequest
      }
      break
    case 'PATCH':
      /// UPDATE a BikeTag profile
      try {
        const data: any = await req.json()
        /// WAIT WHY was this added? this needs to be in the request.
        // delete data.user_metadata?.name
        const profileType = profile.isBikeTagAmbassador
          ? JSONModels.ProfilePatchAmbassador
          : JSONModels.ProfilePatchPlayer
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
          console.log(ErrorMessage.InvalidRequestData, data, profileType)
          body = ErrorMessage.InvalidRequestData
          statusCode = HttpStatusCode.BadRequest
        }
      } catch (e: any) {
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
  name: string,
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
  profile: any,
  authorized = false,
  stringifyResponse = false,
  adminBikeTag?: BikeTagClient,
): Promise<any> => {
  adminBikeTag =
    adminBikeTag ?? new BikeTagClient(getBikeTagClientOpts(undefined, authorized, false))
  const playerName = profile.user_metadata?.name ?? profile.name
  const playerProfileResult = await adminBikeTag.getPlayer(
    { name: playerName },
    {
      source: 'sanity',
    },
  )
  const playerProfile = playerProfileResult.success ? playerProfileResult.data : {}
  const mergedProfile = { ...profile, ...playerProfile }

  return stringifyResponse ? JSON.stringify(mergedProfile) : mergedProfile
}

export const getStartAndEndBytesOfStringWithinString = (outer: string, inner: string) => {
  const encoder = new TextEncoder()
  const innerBytes = encoder.encode(inner)

  const outerUtf16 = [...outer]
  const innerUtf16 = [...inner]

  for (let i = 0; i <= outerUtf16.length - innerUtf16.length; i++) {
    if (outerUtf16.slice(i, i + innerUtf16.length).join('') === inner) {
      const startByte = encoder.encode(outerUtf16.slice(0, i).join('')).length
      const endByte = startByte + innerBytes.length
      return [startByte, endByte]
    }
  }

  return []
}

const uploadImageToBlueSkyFromURL = async (agent: AtpAgent, url: string) => {
  const srcImg = await fetch(url)
  const imgBuffer = await srcImg.arrayBuffer()
  const img = new Uint8Array(imgBuffer)

  const uploadResponse = await agent.uploadBlob(img)
  if (!uploadResponse.success) {
    console.log(ErrorMessage.ImageUploadFailed, { uploadResponse })
    throw new Error(ErrorMessage.ImageUploadFailed)
  }
  return uploadResponse.data.blob
}

export const sendBikeTagPostNotificationToBlueSky = async (
  currentTag: Tag,
  winningTag: Tag,
  host: string,
  game: Game,
) => {
  const winningTagnumber = winningTag.tagnumber
  const heading = `A new BikeTag has been posted for the ${game.name} game!`
  const title = `BikeTag #${winningTagnumber} by ${winningTag.mysteryPlayer}`
  const mysteryAltText = `Hint: ${winningTag.hint}`
  const timestamp = getTagDateISOFromTimezone(currentTag.foundTime, game.region.tz)
  const link = `${host}/${winningTagnumber}`
  const gameLinkFacet = getStartAndEndBytesOfStringWithinString(heading, game.name)
  const imageSource = game.awsRegion ? 'aws' : 'imgur'
  const imageUrl = getImageSized(imageSource, winningTag.mysteryImageUrl, 'l')

  try {
    if (process.env.BSKY_USER && process.env.BSKY_PASS) {
      const bskyUser = process.env.BSKY_USER
      const bskyPass = process.env.BSKY_PASS
      const bskyServer = process.env.BSKY_SERVER ?? 'https://bsky.social'

      console.log('sending bluesky on behalf of ' + bskyUser)

      const agent = new AtpAgent({
        service: bskyServer,
      })

      const loggedIn = await agent.login({
        identifier: bskyUser,
        password: bskyPass,
      })

      const uploadedImage = await uploadImageToBlueSkyFromURL(agent, imageUrl)

      const postCreated = await agent.post({
        $type: 'app.bsky.feed.post',
        text: heading,
        createdAt: timestamp,
        facets: gameLinkFacet.length
          ? [
              {
                index: {
                  byteStart: gameLinkFacet[0],
                  byteEnd: gameLinkFacet[1],
                },
                features: [
                  {
                    $type: 'app.bsky.richtext.facet#link',
                    uri: link,
                  },
                ],
              },
            ]
          : [],
        embed: {
          $type: 'app.bsky.embed.external',
          external: {
            uri: host,
            title,
            description: mysteryAltText,
            thumb: uploadedImage,
          },
        },
      })

      return `bluesky::${postCreated.cid}`
    }
  } catch (e: any) {
    console.log({ blueskyError: e })
  }

  return `bluesky::failed`
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
  const timestamp = getTagDateISOFromTimezone(currentTag.foundTime, game.region.tz)
  const imageSource = game.awsRegion ? 'aws' : 'imgur'
  const mysteryImageUrl = getImageSized(imageSource, winningTag.mysteryImageUrl, 'l')
  const foundImageUrl = getImageSized(imageSource, currentTag.foundImageUrl, 'l')

  if (process.env.DEBUG_A === 'true') {
    console.log('sending notification webhook timestamp', {
      timestamp,
      foundTime: currentTag.foundTime,
      tz: game.region.tz,
    })
  }

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
  skipEmails = false,
  skipSocials = false,
) => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))

  const notificationPromises: any = []
  const ambassadors = (await adminBiketag.ambassadors(undefined, {
    source: 'sanity',
  })) as Ambassador[]
  const thisGamesAmbassadors = ambassadors.filter((a) => game.ambassadors.indexOf(a.name) !== -1)
  const winningTagnumber = winningTag.tagnumber
  const host = `https://${game.name.toLowerCase()}.biketag.org`
  const logo = game.logo?.length
    ? game.logo.indexOf('imgur.co') !== -1
      ? game.logo
      : getSanityImageUrl(game.logo)
    : `${host}${defaultLogo}`

  if (!skipSocials) {
    const sendGlobalDiscordNotification = process.env.DCN
    if (sendGlobalDiscordNotification) {
      log('Sending global Discord notification', { game: game.name }, 'info')
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

    const sendGlobalBlueSkyNotification = process.env.BSN
    if (sendGlobalBlueSkyNotification) {
      log('Sending global BlueSky notification', { game: game.name }, 'info')
      notificationPromises.push(
        sendBikeTagPostNotificationToBlueSky(currentTag, winningTag, host, game),
      )
    }

    const sendGlobalSlackNotification = process.env.SLN
    if (sendGlobalSlackNotification) {
      log('Sending global Slack notification', { game: game.name }, 'info')
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
      log('Sending Discord notification for game', { game: game.name }, 'info')
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
      log('Sending Slack notification for game', { game: game.name }, 'info')
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
  } else {
    log('Skipping social notifications', { game: game.name }, 'info')
  }

  if (
    !skipEmails &&
    (!game.settings['emails::disable'] ||
      game.settings['emails::disable'].split(',').indexOf('new-biketag-notification') === -1)
  ) {
    log(
      'Sending new BikeTag email notifications',
      { game: game.name, ambassadors: thisGamesAmbassadors.length },
      'info',
    )
    notificationPromises.push(
      sendEmailsToAmbassadors(
        'biketag-auto-posted',
        `New BikeTag Round (#${winningTagnumber}) Auto-Posted for [${game.name}]`,
        thisGamesAmbassadors,
        (a) => ({
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
          blueskyLink: `https://bsky.app/profile/${game.bluesky?.length ? game.bluesky : 'biketag.bsky.social'}`,
        }),
      ).then((results) => results.accepted.concat(results.rejected)),
    )
  } else {
    log(
      'Sending of emails disabled for new-biketag-notification',
      { disabled: game.settings['emails::disable'] },
      'info',
    )
  }

  return notificationPromises
}

export const setNewBikeTagPost = async (
  game: Game,
  winningBikeTagPost: Tag,
  previousBikeTag: Tag,
  adminBiketag?: BikeTagClient,
  nonAdminBiketag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))
  const imageSource = game.awsRegion ? 'aws' : 'imgur'
  previousBikeTag =
    previousBikeTag ?? ((await adminBiketag.getTag(undefined, { source: imageSource })).data as Tag)
  let errors = false
  const results: any = []

  const newBikeTagPost = BikeTagClient.getters.getOnlyMysteryTagFromTagData(winningBikeTagPost)
  newBikeTagPost.gps = { lat: 0, long: 0, alt: 0 }
  previousBikeTag.gps = winningBikeTagPost.gps
  previousBikeTag.foundImageUrl = winningBikeTagPost.foundImageUrl
  previousBikeTag.foundTime = winningBikeTagPost.foundTime
  previousBikeTag.foundLocation = winningBikeTagPost.foundLocation
  previousBikeTag.foundPlayer = winningBikeTagPost.foundPlayer

  log('Updating current BikeTag with winning tag found info', previousBikeTag, 'info')
  const currentBikeTagUpdateResult = await adminBiketag.updateTag(previousBikeTag, {
    source: imageSource,
  })
  log('Result of currentBikeTag update', currentBikeTagUpdateResult, 'info')

  if (currentBikeTagUpdateResult.success) {
    results.push({ message: 'current BikeTag updated', game: game.name, tag: previousBikeTag })
  } else {
    results.push({
      message: 'current BikeTag was not updated',
      error: currentBikeTagUpdateResult.error,
      game: game.name,
      tag: previousBikeTag,
    })
    errors = true
  }

  const newBikeTagUpdateResult = await adminBiketag.updateTag(newBikeTagPost, {
    source: imageSource,
  })
  log('Result of newBikeTag update', newBikeTagUpdateResult, 'info')

  if (newBikeTagUpdateResult.success) {
    results.push({
      message: 'new BikeTag posted',
      game: game.name,
      tag: newBikeTagUpdateResult.data,
    })
  } else {
    results.push({
      message: ErrorMessage.BikeTagNotPosted,
      error: newBikeTagUpdateResult.error,
      game: game.name,
      tag: newBikeTagPost,
    })
    errors = true
  }

  if (currentBikeTagUpdateResult.success && newBikeTagUpdateResult.success) {
    axios
      .post(
        getApiUrl(game.name, 'autopost-notify'),
        {},
        { headers: { 'Content-Type': 'application/json' } },
      )
      .catch((e) => log(ErrorMessage.NotificationsNotSent, e.message ?? e, 'warn'))

    const nonAdminBikeTagOpts = getBikeTagClientOpts(undefined, true)
    nonAdminBikeTagOpts.game = game.name.toLocaleLowerCase()
    nonAdminBikeTagOpts.imgur.hash = game.queuehash
    nonAdminBikeTagOpts.aws.region = game.awsRegion
    if (!nonAdminBiketag) {
      nonAdminBiketag = new BikeTagClient(nonAdminBikeTagOpts)
    } else {
      nonAdminBiketag.config(nonAdminBikeTagOpts)
    }

    const deleteWinningTagFromQueueResult = await nonAdminBiketag.deleteTag(winningBikeTagPost, {
      source: imageSource,
    })
    log('Result of deleting winning tag from queue', deleteWinningTagFromQueueResult, 'info')

    if (deleteWinningTagFromQueueResult.success) {
      results.push({
        message: 'winning tag deleted from queue',
        game: game.name,
        tag: winningBikeTagPost,
      })
    } else {
      results.push({
        message: ErrorMessage.WinningTagNotDeleted,
        game: game.name,
        tag: winningBikeTagPost,
      })
      errors = true
    }

    axios
      .post(
        getApiUrl(game.name, 'autopost-clear'),
        {},
        { headers: { 'Content-Type': 'application/json' } },
      )
      .catch((e) => log(ErrorMessage.QueueNotCleared, e.message ?? e, 'warn'))
  }

  return { results, errors }
}

export const getWinningTagForCurrentRound = (
  timedOutTags: Tag[],
  currentBikeTag: Tag,
): Tag | undefined => {
  if (timedOutTags.length) {
    const orderedTimedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
    const winner = orderedTimedOutTags[0]
    if (currentBikeTag.tagnumber === winner.tagnumber - 1) {
      return winner
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
  } catch (e: any) {
    // console.log({
    //   domain: process.env.A_DOMAIN,
    //   client_id: process.env.A_M_CID,
    //   client_secret: process.env.A_M_CS,
    //   audience: process.env.A_AUDIENCE,
    // })
    console.log(ErrorMessage.getAuthManagementToken, e.message)
  }
}

export const auth0Headers = async () => {
  const accessToken = (await isAuthenticationEnabled()) ? await getAuthManagementToken() : null
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }

  return {}
}

export const acceptCorsHeaders = (
  accept = '*',
  allow = '*',
  contentType = 'application/json',
  methods = '*',
  origin = '*',
  maxAge = '8640',
) => ({
  Accept: accept,
  'Access-Control-Allow-Headers': allow,
  'Content-Type': contentType,
  'Access-Control-Allow-Methods': methods,
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Max-Age': maxAge,
})

export const constructAmbassadorProfile = (
  profile: any = {},
  defaults: any = {},
): BikeTagProfile => {
  profile = profile ?? {}
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
      bluesky:
        profile?.user_metadata?.social?.bluesky ?? defaults?.user_metadata?.social?.bluesky ?? '',
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
  profile = profile ?? {}
  const user_metadata = {
    name: profile?.user_metadata?.name ?? defaults?.user_metadata?.name ?? '',
    social: {
      reddit: profile?.user_metadata?.reddit ?? defaults?.user_metadata?.reddit ?? '',
      instagram: profile?.user_metadata?.instagram ?? defaults?.user_metadata?.instagram ?? '',
      bluesky: profile?.user_metadata?.bluesky ?? defaults?.user_metadata?.bluesky ?? '',
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
    zipcode: profile?.zipcode ?? defaults.zipcode ?? '',
  } as BikeTagProfile
}

export const getEnvironmentVariable = (key: string) => {
  if (process.env[key]) {
    return decompress(process.env[key], { inputEncoding: 'Base64' })
  }
}
