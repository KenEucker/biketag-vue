import { AtpAgent } from '@atproto/api'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
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
import moment from 'moment-timezone'
import nodemailer from 'nodemailer'
import { extname, join } from 'path'
import qs from 'qs'
import { ErrorMessage, HttpStatusCode, JSONModels } from './constants'
import { BackgroundProcessResults, activeQueue, BikeTagProfile } from './types'

const ajv = new Ajv()

let log: (message: string, data?: any, level?: 'info' | 'warn' | 'error') => void

if (process.env.DEBUG_BE === 'true' || process.env.DEBUG_A === 'true') {
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

const getImgurImageSized = (imgurUrl = '', size = 'm') =>
  imgurUrl
    .replace('.jpg', `${size}.jpg`)
    .replace('.jpeg', `${size}.jpg`)
    .replace('.gif', `${size}.gif`)
    .replace('.png', `${size}.png`)
    .replace('.webp', `${size}.webp`)
    .replace('.mp4', `${size}.mp4`)

const getS3ImageSized = (
  imageUrl: string = '',
  size: 'small' | 'medium' | 'original' = 'original',
): string => {
  if (!imageUrl || size === 'original') return imageUrl

  if (/digitaloceanspaces\.com/.test(imageUrl)) {
    const isMainFolder = /\/main\//.test(imageUrl)
    const ext = imageUrl.match(/(\.[a-z0-9]+)(?:\?.*)?$/i)?.[1]?.toLowerCase() ?? ''
    const base = imageUrl.replace(/(_small|_medium)?\.[a-z0-9]+(?:\?.*)?$/i, '')

    if (isMainFolder || ext === '.webp') {
      return `${base}_${size}.webp`
    }

    return imageUrl
  }

  return imageUrl.replace(/(_small|_medium)?(\.\w+)$/, `_${size}$2`)
}

const getImageSized = (
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

  if (/imgur\.com/.test(imageUrl)) {
    return getImgurImageSized(imageUrl, size)
  }

  if (/digitaloceanspaces\.com/.test(imageUrl)) {
    return getS3ImageSized(imageUrl, resolvedSize)
  }

  switch (imageSource) {
    case 'aws':
      return getS3ImageSized(imageUrl, resolvedSize)
    case 'imgur':
    default:
      return getImgurImageSized(imageUrl, size)
  }
}

const getDomainInfo = (req: any) => {
  const defaultHost = process.env.HOST ?? 'biketag.org'
  const nonSubdomainHosts = [`${defaultHost}`, 'biketag.dev', '0.0.0.0', 'localhost']
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

const getTagDateISOFromTimezone = (time: number, tz?: string) => {
  let datetime = moment(time * 1000)
  if (tz?.length) {
    datetime = datetime.tz(tz)
  }
  return datetime.utc().format()
}

const isAuthenticationEnabled = () => !!process.env.A_DOMAIN?.length

export const getApiUrl = (game = '', path = ''): string => {
  return process.env.CONTEXT === 'dev'
    ? `http://${game.length ? `${game}.` : ''}${process.env.HOST}:7200/.netlify/functions/${path}`
    : `https://${game.length ? `${game}.` : ''}${process.env.HOST}/api/${path}`
}

export const getGameSiteUrl = (gameName = ''): string => {
  const baseHost = (process.env.HOST ?? 'biketag.org').replace(/^www\./i, '')
  const gameSlug = gameName.toLowerCase()
  return process.env.CONTEXT === 'dev'
    ? `http://${gameSlug.length ? `${gameSlug}.` : ''}${baseHost}:8080`
    : `https://${gameSlug.length ? `${gameSlug}.` : ''}${baseHost}`
}

export const getGameSocialLinks = (game: Game) => {
  const subreddit = game.subreddit?.length
    ? game.subreddit
    : game.settings?.['social::reddit']?.length
      ? game.settings['social::reddit']
      : game.settings?.['subreddit']?.length
        ? game.settings['subreddit']
        : 'biketag'

  const bluesky = game.bluesky?.length
    ? game.bluesky
    : game.settings?.['social::bluesky']?.length
      ? game.settings['social::bluesky']
      : game.settings?.['bsky']?.length
        ? game.settings['bsky']
        : 'biketag.bsky.social'

  const instagramHandle = game.page?.length
    ? game.page
    : game.settings?.['social::instagram']?.length
      ? game.settings['social::instagram']
      : ''

  const instagramLink = instagramHandle?.length
    ? instagramHandle.startsWith('http')
      ? instagramHandle
      : `https://instagram.com/${instagramHandle.replace(/^@/, '')}`
    : ''

  return {
    redditLink: `https://reddit.com/r/${subreddit}`,
    blueskyLink: `https://bsky.app/profile/${bluesky}`,
    instagramLink,
  }
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
    // verbose: process.env.DEBUG_BE === 'true',
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
      region: game?.awsRegion,
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

export const isGlobalAdminEmail = (email?: string | null): boolean => {
  if (!email?.length || !process.env.ADMIN_EMAIL?.length) {
    return false
  }

  return email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
}

export const getProfileAuthorization = async (req: Request): Promise<any> => {
  const authorization = await getPayloadAuthorization(req)
  let profile: any = authorization?.isValid ? { ...authorization.profile } : null

  if (authorization?.isValid && profile) {
    log('Valid authorization received for profile', { email: profile.email }, 'info')

    const isGlobalAdmin = isGlobalAdminEmail(profile.email)
    const adminBiketagOpts = getBikeTagClientOpts(req, true, true)
    const adminBiketag = new BikeTagClient(adminBiketagOpts)
    const thisGamesAmbassadors = ((await getThisGamesAmbassadors(adminBiketag, {
      source: 'sanity',
    })) ?? []) as Ambassador[]

    const profileId = profile.sub ?? profile.p_id
    const profileAmbassadorMatch = thisGamesAmbassadors.filter((a) => {
      if (profile.email && a.email === profile.email) return true
      if (profileId && (a.id === profileId || a.player?.sub === profileId)) return true
      return false
    })
    const isABikeTagAmbassador = profileAmbassadorMatch.length > 0 || isGlobalAdmin
    const roleFlags: Record<string, boolean> = {}

    if (isABikeTagAmbassador) {
      roleFlags.isBikeTagAmbassador = true
      log('Profile marked as BikeTagAmbassador', { email: profile.email }, 'info')
    }

    if (isGlobalAdmin) {
      roleFlags.isBikeTagAdmin = true
      log('Profile marked as BikeTagAdmin', { email: profile.email }, 'info')
    }

    profile = profileAmbassadorMatch.length
      ? { ...profile, ...profileAmbassadorMatch[0], ...roleFlags, sub: profile.sub ?? profile.p_id }
      : { ...profile, ...roleFlags, sub: profile.sub ?? profile.p_id }
  }

  return profile
}

export const requireGlobalAdmin = (profile: any): boolean => {
  return isGlobalAdminEmail(profile?.email)
}

/**
 * ─── queue-fix helpers (used by functions/queue-fix.mts) ───
 *
 * Storage layout (AWS games):
 *   queue/{game}-tag-{N}--{found|mystery}--{hash}.webp (+ _medium, _small)
 *   main/{game}-tag-{N}--{found|mystery}.webp (+ variants)
 *   main/index.json, queue/index.json — tag metadata arrays (biketag format)
 *
 * Round rules for queue/ validation:
 *   found image filename round → current live round (also accept current + 1; uploads sometimes use that)
 *   mystery image filename round → current live round + 1
 *
 * Orphan found: queue file is a found image for a past round whose main/ --found slot is empty.
 * Misfiled case: filename uses live round (N) but metadata t=N-1 → target round is metadata.
 */
export type QueueIssueCategory =
  | 'non-webp'
  | 'missing-variants'
  | 'wrong-round'
  | 'duplicate-uploader'
  | 'orphaned-main-found'

export type OrphanedQueueFoundComparePreview = {
  mysteryImageUrl: string
  candidateFoundUrl: string
  expectedFoundPlayer?: string
  queueFoundPlayer?: string
  expectedFoundPlayerId?: string
  queueFoundPlayerId?: string
  playerVerified?: boolean
  playerConflict?: boolean
}

export type QueueIssue = {
  category: QueueIssueCategory
  tagnumber: number
  playerId?: string
  player?: string
  type?: 'found' | 'mystery'
  url?: string
  key?: string
  deletable?: boolean
  repairable?: boolean
  targetTagnumber?: number
  metadataTagnumber?: number
  comparePreview?: OrphanedQueueFoundComparePreview
  issue: string
  relatedTagnumbers?: number[]
}

export type MainFolderContext = {
  gameSlug: string
  mainKeys: string[]
  mainTagsByRound: Map<number, Tag>
  currentTag?: Tag
}

export type OrphanedQueueFoundCheck = {
  structural: boolean
  playerVerified: boolean
  playerConflict: boolean
  targetRound?: number
  reasons: string[]
  comparePreview?: OrphanedQueueFoundComparePreview
}

const queuePathPattern = /\/queue\//
const nonWebpImagePattern = /\.(jpe?g|png|gif|bmp)(?:\?.*)?$/i
const queueSizedVariantKeyPattern = /_(medium|small)\.webp$/i
const queuePrimaryImageKeyPattern =
  /^queue\/(.+?)--(mystery|found)(?:--([a-z0-9]+))?\.(webp|jpg|jpeg|png|gif|bmp)$/i

const isQueueSizedVariantKey = (key: string): boolean =>
  queueSizedVariantKeyPattern.test(key.split('/').pop() ?? '')

/** Zero-byte folder objects (e.g. `queue/`) that some buckets include in ListObjects results. */
const isStoragePrefixMarkerKey = (key: string): boolean => {
  const trimmed = key.replace(/\/+$/, '')
  return trimmed.length > 0 && !trimmed.includes('/')
}

const getAllowedQueueRoundForImage = (
  currentTag: Tag | undefined,
  type: 'found' | 'mystery',
): number | undefined => {
  if (currentTag?.tagnumber === undefined) return undefined
  return type === 'found' ? currentTag.tagnumber : currentTag.tagnumber + 1
}

const isAllowedQueueRoundForImage = (
  currentTag: Tag | undefined,
  type: 'found' | 'mystery',
  imageRound: number,
): boolean => {
  const expectedRound = getAllowedQueueRoundForImage(currentTag, type)
  if (expectedRound === undefined) return true
  if (imageRound === expectedRound) return true
  // Found images are sometimes keyed at current+1 (same as mystery) during upload/post flows.
  if (type === 'found' && imageRound === expectedRound + 1) return true
  return false
}

const isNormalFoundMysteryPair = (group: QueueStorageImage[]): boolean => {
  const tagnumbers = [...new Set(group.map((image) => image.tagnumber))].sort((a, b) => a - b)
  if (tagnumbers.length !== 2 || tagnumbers[1] - tagnumbers[0] !== 1) return false
  const foundCount = group.filter((image) => image.type === 'found').length
  const mysteryCount = group.filter((image) => image.type === 'mystery').length
  return foundCount === 1 && mysteryCount === 1
}

export const getGameStorageSlug = (game: Game, fallback = ''): string =>
  (game.slug ?? game.name ?? fallback).toLowerCase()

export const getMainTagIdentity = (
  gameSlug: string,
  tagnumber: number,
): { slug: string; name: string } => {
  const slug = `${gameSlug}-tag-${tagnumber}`
  return { slug, name: slug }
}

export const getExpectedMainTagSlug = (gameSlug: string, tagnumber: number): string =>
  getMainTagIdentity(gameSlug, tagnumber).slug

const getStorageKeyFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname.slice(1)
  } catch {
    return ''
  }
}

const getQueueImageFilenameBase = (imageUrl: string): string => {
  const filename = getStorageKeyFromUrl(imageUrl).split('/').pop() ?? ''
  return filename.replace(/\.(webp|jpg|jpeg|png|gif|bmp)$/i, '')
}

export const queueImageHasVariants = async (
  region: string,
  gameSlug: string,
  imageUrl: string,
): Promise<boolean> => {
  const base = getQueueImageFilenameBase(imageUrl)
  const bucket = `${gameSlug}-biketag`
  const client = createQueueStorageClient(region)

  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: `queue/${base}_small.webp` }))
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: `queue/${base}_medium.webp` }))
    return true
  } catch {
    return false
  }
}

const requireQueueImageVariants = async (
  game: Game,
  imageUrl: string,
  label: string,
): Promise<void> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  if (!(await queueImageHasVariants(region, gameSlug, imageUrl))) {
    throw new Error(
      `${label} image is missing queue size variants — upload processing may still be in progress`,
    )
  }
}

const isStorageObjectNotFound = (error: unknown): boolean => {
  const name = (error as { name?: string })?.name
  const code = (error as { Code?: string; $metadata?: { httpStatusCode?: number } })?.Code
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  return name === 'NotFound' || name === 'NoSuchKey' || code === 'NotFound' || status === 404
}

type QueueToMainCopyPair = { srcKey: string; destKey: string; convertToWebp?: boolean }

const queuePrimarySourceExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp'] as const

const storageObjectExists = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    if (isStorageObjectNotFound(error)) return false
    throw error instanceof Error ? error : new Error(`storage check failed for ${key}`)
  }
}

const getQueuePrimarySourceCandidates = (filenameBase: string, preferredSourceKey?: string): string[] => {
  const fromExtensions = queuePrimarySourceExtensions.map((ext) => `queue/${filenameBase}${ext}`)
  if (!preferredSourceKey?.length) return fromExtensions
  return [preferredSourceKey, ...fromExtensions.filter((key) => key !== preferredSourceKey)]
}

const getMainDestKeyForVariant = (destBase: string, variant: '' | '_small' | '_medium'): string =>
  variant === '' ? `${destBase}.webp` : `${destBase}${variant}.webp`

const resolveQueueToMainCopyPlan = async (
  client: S3Client,
  bucket: string,
  filenameBase: string,
  destBase: string,
  sourceKey: string,
): Promise<{ pairs: QueueToMainCopyPair[]; skippedDestKeys: string[]; checkedSourceKeys: string[] }> => {
  const pairs: QueueToMainCopyPair[] = []
  const skippedDestKeys: string[] = []
  const checkedSourceKeys: string[] = []
  const variants = ['', '_small', '_medium'] as const

  for (const variant of variants) {
    const destKey = getMainDestKeyForVariant(destBase, variant)

    if (await storageObjectExists(client, bucket, destKey)) {
      skippedDestKeys.push(destKey)
      continue
    }

    const sourceCandidates =
      variant === ''
        ? getQueuePrimarySourceCandidates(filenameBase, sourceKey)
        : [`queue/${filenameBase}${variant}.webp`]

    let srcKey: string | undefined
    for (const candidate of sourceCandidates) {
      checkedSourceKeys.push(candidate)
      if (await storageObjectExists(client, bucket, candidate)) {
        srcKey = candidate
        break
      }
    }

    if (srcKey) {
      pairs.push({
        srcKey,
        destKey,
        convertToWebp: !/\.webp$/i.test(srcKey),
      })
    }
  }

  return { pairs, skippedDestKeys, checkedSourceKeys }
}

const copyOrConvertQueueObjectToMain = async (
  gameSlug: string,
  region: string,
  client: S3Client,
  bucket: string,
  srcKey: string,
  destKey: string,
  convertToWebp: boolean,
): Promise<void> => {
  if (!convertToWebp) {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${srcKey}`,
        Key: destKey,
        ACL: 'public-read',
        MetadataDirective: 'COPY',
      }),
    )
    return
  }

  const publicUrl = `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${srcKey}`
  const resizeUrl = getApiUrl(gameSlug.toLowerCase(), 'resize')

  log('[queue-to-main] Converting queue image to webp via resize', {
    srcKey,
    destKey,
    publicUrl,
    resizeUrl,
  })

  const response = await axios.get(resizeUrl, {
    params: { url: publicUrl, format: 'webp' },
    responseType: 'arraybuffer',
    timeout: 60000,
    validateStatus: () => true,
  })

  if (response.status !== 200) {
    const detail =
      typeof response.data === 'string' && response.data.length
        ? response.data
        : `HTTP ${response.status}`
    throw new Error(`webp conversion failed for ${srcKey}: ${detail}`)
  }

  const webpBuffer = Buffer.from(response.data)
  if (!webpBuffer.length) {
    throw new Error(`webp conversion returned empty body for ${srcKey}`)
  }

  log('[queue-to-main] Converted queue image to webp', {
    srcKey,
    destKey,
    bytes: webpBuffer.length,
  })

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: destKey,
      Body: webpBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read',
    }),
  )
}

const executeQueueToMainCopies = async (
  gameSlug: string,
  region: string,
  client: S3Client,
  bucket: string,
  pairs: QueueToMainCopyPair[],
): Promise<string[]> => {
  const copiedSourceKeys: string[] = []

  for (const { srcKey, destKey, convertToWebp = false } of pairs) {
    log('[queue-to-main] Copying queue image to main', {
      srcKey,
      destKey,
      convertToWebp,
    })
    try {
      await copyOrConvertQueueObjectToMain(
        gameSlug,
        region,
        client,
        bucket,
        srcKey,
        destKey,
        convertToWebp,
      )
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: srcKey }))
      copiedSourceKeys.push(srcKey)
      log('[queue-to-main] Copied queue image to main', { srcKey, destKey })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'queue to main copy failed'
      log('[queue-to-main] Failed copying queue image to main', { srcKey, destKey, error: message }, 'error')
      throw error instanceof Error ? error : new Error(message)
    }
  }

  return copiedSourceKeys
}

const copyQueueImageToMainIfAbsent = async (
  gameSlug: string,
  region: string,
  sourceUrl: string,
  targetTagnumber: number,
  type: 'found' | 'mystery',
): Promise<string> => {
  const sourceKey = getStorageKeyFromUrl(sourceUrl)
  if (!sourceKey.startsWith('queue/')) {
    return sourceUrl
  }

  const filenameBase = getQueueImageFilenameBase(sourceUrl)
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)
  const destBase = `main/${gameSlug}-tag-${targetTagnumber}--${type}`
  const destUrl = `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${destBase}.webp`
  const primaryDestKey = getMainDestKeyForVariant(destBase, '')

  const { pairs, skippedDestKeys, checkedSourceKeys } = await resolveQueueToMainCopyPlan(
    client,
    bucket,
    filenameBase,
    destBase,
    sourceKey,
  )

  log('[queue-to-main] Resolved queue→main copy plan', {
    sourceKey,
    destBase,
    pairs: pairs.map(({ srcKey, destKey, convertToWebp }) => ({ srcKey, destKey, convertToWebp })),
    skippedDestKeys,
    checkedSourceKeys,
  })

  if (!pairs.length) {
    const primaryExists = await storageObjectExists(client, bucket, primaryDestKey)
    if (primaryExists) {
      log('[queue-to-main] Main primary already present — cleaning up queue orphan only', {
        sourceKey,
        primaryDestKey,
        skippedDestKeys,
      })
      await deleteQueueImageGroupFromStorage(gameSlug, region, sourceKey)
      return destUrl
    }

    throw new Error(
      `no queue image files found to copy from ${sourceKey} (checked ${[...new Set(checkedSourceKeys)].join(', ')}; main dest ${primaryDestKey} is missing)`,
    )
  }

  await executeQueueToMainCopies(gameSlug, region, client, bucket, pairs)
  log('[queue-to-main] Finished queue→main copies', { sourceKey, destUrl, copied: pairs.length })
  return destUrl
}

/**
 * Copy queue/ image (+ _medium, _small when present) to main/{game}-tag-{N}--{type}.webp, then delete queue copies.
 * Skips main/ keys that already exist. Converts non-webp queue primaries to webp on copy.
 * Used by approve. Does not update main/index.json.
 */
export const moveQueueImageToMainWithVariants = async (
  gameSlug: string,
  region: string,
  sourceUrl: string,
  targetTagnumber: number,
  type: 'found' | 'mystery',
): Promise<string> =>
  copyQueueImageToMainIfAbsent(gameSlug, region, sourceUrl, targetTagnumber, type)

/** queue-fix Move to main — same as moveQueueImageToMainWithVariants but found images only. */
export const copyQueueFoundToMainIfAbsent = async (
  gameSlug: string,
  region: string,
  sourceUrl: string,
  targetTagnumber: number,
): Promise<string> =>
  copyQueueImageToMainIfAbsent(gameSlug, region, sourceUrl, targetTagnumber, 'found')

export type QueueStorageImage = {
  key: string
  url: string
  baseKey: string
  type: 'found' | 'mystery'
  tagnumber: number
  metadataTagnumber?: number
  playerHash: string
  extension: string
  playerId?: string
  mysteryPlayer?: string
  foundPlayer?: string
  title?: string
  description?: string
}

export const createQueueStorageClient = (region: string): S3Client => {
  return new S3Client({
    region,
    endpoint: `https://${region}.digitaloceanspaces.com`,
    credentials: {
      accessKeyId: process.env.S3_BE_ACCESS_ID ?? '',
      secretAccessKey: process.env.S3_BE_ACCESS_KEY ?? '',
    },
  })
}

const decodeQueueMetadataValue = (value: string): string => {
  try {
    if (!value || !/^[A-Za-z0-9+/=]+$/.test(value)) return value
    return Buffer.from(value, 'base64').toString('utf-8')
  } catch {
    return value
  }
}

const parseQueueObjectMetadata = (data?: string) => {
  if (!data) return undefined
  try {
    const tag = JSON.parse(decodeQueueMetadataValue(data))
    const tagnumber = typeof tag.t === 'number' ? tag.t : undefined
    if (tagnumber === undefined) return undefined
    return {
      tagnumber,
      playerId: tag.p as string | undefined,
      mysteryPlayer: tag.mp as string | undefined,
      foundPlayer: tag.fp as string | undefined,
    }
  } catch {
    return undefined
  }
}

const parseTagnumberFromQueueKey = (key: string): number | undefined => {
  const match = key.match(/-tag-(\d+)--(?:mystery|found)--/i)
  return match ? parseInt(match[1], 10) : undefined
}

export const parseTagnumberFromStorageKey = parseTagnumberFromQueueKey

const getMainFoundFileKey = (gameSlug: string, tagnumber: number): string =>
  `main/${gameSlug}-tag-${tagnumber}--found.webp`

const getMainMysteryFileKey = (gameSlug: string, tagnumber: number): string =>
  `main/${gameSlug}-tag-${tagnumber}--mystery.webp`

const parseRoundFromMainImageUrl = (url?: string): number | undefined => {
  if (!url?.length) return undefined
  const match = url.match(/-tag-(\d+)--(?:mystery|found)/i)
  return match ? parseInt(match[1], 10) : undefined
}

const buildMainImageUrlFromReference = (
  referenceUrl: string,
  gameSlug: string,
  tagnumber: number,
  type: 'mystery' | 'found',
): string => {
  try {
    const url = new URL(referenceUrl)
    url.pathname = `/main/${gameSlug}-tag-${tagnumber}--${type}.webp`
    return url.toString()
  } catch {
    return ''
  }
}

/** Prefer the main/ file for this round; index mysteryImageUrl can be wrong after partial approve. */
const getMainMysteryImageUrlForRound = (
  gameSlug: string,
  targetRound: number,
  mainTag: Tag,
  mainKeys: string[],
  referenceUrl?: string,
): string | undefined => {
  const mysteryKey = getMainMysteryFileKey(gameSlug, targetRound)
  const indexUrl = mainTag.mysteryImageUrl?.trim()
  const indexRound = parseRoundFromMainImageUrl(indexUrl)

  if (indexUrl && indexRound === targetRound) {
    return indexUrl
  }

  if (mainKeys.includes(mysteryKey)) {
    const reference = referenceUrl || indexUrl
    if (reference?.length) {
      return buildMainImageUrlFromReference(reference, gameSlug, targetRound, 'mystery')
    }
  }

  return undefined
}

const normalizePlayerName = (name?: string): string => (name ?? '').trim().toLowerCase()

const getMainTagForRound = (round: number, main: MainFolderContext): Tag | undefined => {
  if (main.currentTag?.tagnumber === round) return main.currentTag
  return main.mainTagsByRound.get(round)
}

const foundImageUrlPointsToMain = (url?: string): boolean =>
  !!url?.trim() && /\/main\//.test(url) && /--found/.test(url)

const mainTagMissingFoundImage = (
  gameSlug: string,
  targetRound: number,
  mainTag: Tag,
  mainKeys: string[],
): boolean => {
  const hasMainFile = mainKeys.includes(getMainFoundFileKey(gameSlug, targetRound))
  const urlPointsToMain = foundImageUrlPointsToMain(mainTag.foundImageUrl)
  return !hasMainFile || !urlPointsToMain
}

const resolveQueueFoundPlayerInfo = (
  image: QueueStorageImage,
  simulatedQueue: Tag[] = [],
): { foundPlayer?: string; playerId?: string } => {
  for (const tag of simulatedQueue) {
    const tagKey = tag.foundImageUrl ? getStorageKeyFromUrl(tag.foundImageUrl) : ''
    if (tagKey === image.key || tag.foundImageUrl === image.url) {
      return {
        foundPlayer: tag.foundPlayer?.trim() || image.foundPlayer?.trim(),
        playerId: tag.playerId ?? image.playerId,
      }
    }
  }

  return {
    foundPlayer: image.foundPlayer?.trim(),
    playerId: image.playerId,
  }
}

const resolveExpectedFinderForFoundRound = (
  targetRound: number,
  mainTag: Tag,
  main: MainFolderContext,
): { foundPlayer?: string; playerId?: string } => {
  const nextTag = getMainTagForRound(targetRound + 1, main)
  const fromNext = nextTag?.mysteryPlayer?.trim()
  if (fromNext?.length) {
    return { foundPlayer: fromNext, playerId: nextTag?.playerId }
  }

  const fromMainTag = mainTag.foundPlayer?.trim()
  if (fromMainTag?.length) {
    return { foundPlayer: fromMainTag, playerId: mainTag.playerId ?? nextTag?.playerId }
  }

  return { foundPlayer: undefined, playerId: nextTag?.playerId ?? mainTag.playerId }
}

const evaluatePlayerMatch = (
  queue: { foundPlayer?: string; playerId?: string },
  expected: { foundPlayer?: string; playerId?: string },
): { verified: boolean; conflict: boolean } => {
  const queueName = normalizePlayerName(queue.foundPlayer)
  const expectedName = normalizePlayerName(expected.foundPlayer)

  if (queueName && expectedName && queueName !== expectedName) {
    return { verified: false, conflict: true }
  }

  if (queue.playerId && expected.playerId && queue.playerId !== expected.playerId) {
    return { verified: false, conflict: true }
  }

  if (queueName && expectedName && queueName === expectedName) {
    return { verified: true, conflict: false }
  }

  if (queue.playerId && expected.playerId && queue.playerId === expected.playerId) {
    return { verified: true, conflict: false }
  }

  return { verified: false, conflict: false }
}

/** Live-round found submission: filename is current and metadata is absent or also at/above current. */
const isCurrentRoundQueueFoundSubmission = (
  keyRound: number,
  metaRound: number | undefined,
  currentRound: number,
): boolean => {
  if (keyRound !== currentRound) return false
  if (metaRound === undefined) return true
  return metaRound >= currentRound
}

/** Rounds in main/ a queue found image may belong to (filename and/or metadata). */
export const resolveOrphanTargetsForImage = (
  image: QueueStorageImage,
  currentRound: number,
): number[] => {
  if (image.type !== 'found') return []

  const keyRound = parseTagnumberFromQueueKey(image.key) ?? image.tagnumber
  const metaRound = image.metadataTagnumber

  // Both filename and metadata point at the live round — normal queue submission.
  if (isCurrentRoundQueueFoundSubmission(keyRound, metaRound, currentRound)) {
    return []
  }

  const targets = new Set<number>()

  // Either number below the live round may name a past-round orphan.
  if (keyRound < currentRound) {
    targets.add(keyRound)
  }
  if (metaRound !== undefined && metaRound < currentRound) {
    targets.add(metaRound)
  }

  return [...targets]
}

/** Validates moving a queue found image onto a specific past main tag round. */
export const evaluateOrphanedQueueFoundForTarget = (
  image: QueueStorageImage,
  targetRound: number,
  main: MainFolderContext,
  simulatedQueue: Tag[] = [],
): OrphanedQueueFoundCheck => {
  const currentTag = main.currentTag
  if (image.type !== 'found') {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      reasons: ['not a found image'],
    }
  }
  if (currentTag?.tagnumber === undefined) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      reasons: ['current round is unknown'],
    }
  }

  const keyRound = parseTagnumberFromQueueKey(image.key) ?? image.tagnumber

  if (targetRound >= currentTag.tagnumber) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound,
      reasons: [`target round #${targetRound} is the current or a future round`],
    }
  }

  const allowedTargets = resolveOrphanTargetsForImage(image, currentTag.tagnumber)
  if (!allowedTargets.includes(targetRound)) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound,
      reasons: [
        `queue filename #${keyRound} and metadata #${image.metadataTagnumber ?? 'none'} do not indicate orphan target #${targetRound}`,
      ],
    }
  }

  const mainTag = getMainTagForRound(targetRound, main)
  if (!mainTag) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound,
      reasons: [`main index has no tag for round #${targetRound}`],
    }
  }

  if (!mainTagMissingFoundImage(main.gameSlug, targetRound, mainTag, main.mainKeys)) {
    const hasMainFile = main.mainKeys.includes(getMainFoundFileKey(main.gameSlug, targetRound))
    const urlPointsToMain = foundImageUrlPointsToMain(mainTag.foundImageUrl)
    const detail =
      hasMainFile && urlPointsToMain
        ? 'file and index entry'
        : hasMainFile
          ? 'main file'
          : urlPointsToMain
            ? 'main index foundImageUrl'
            : 'unknown state'
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound,
      reasons: [`main already has a found image (${detail}) for round #${targetRound}`],
    }
  }

  const mysteryUrl = getMainMysteryImageUrlForRound(
    main.gameSlug,
    targetRound,
    mainTag,
    main.mainKeys,
    image.url,
  )
  if (!mysteryUrl?.length) {
    const indexRound = parseRoundFromMainImageUrl(mainTag.mysteryImageUrl)
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound,
      reasons: [
        indexRound !== undefined && indexRound !== targetRound
          ? `main index mysteryImageUrl points at round #${indexRound}, not #${targetRound}, and main/${main.gameSlug}-tag-${targetRound}--mystery.webp was not found in storage`
          : `main tag #${targetRound} has no mystery image to compare against`,
      ],
    }
  }

  const queuePlayerInfo = resolveQueueFoundPlayerInfo(image, simulatedQueue)
  const expectedPlayerInfo = resolveExpectedFinderForFoundRound(targetRound, mainTag, main)
  const playerMatch = evaluatePlayerMatch(queuePlayerInfo, expectedPlayerInfo)

  return {
    structural: true,
    playerVerified: playerMatch.verified,
    playerConflict: playerMatch.conflict,
    targetRound,
    reasons: playerMatch.conflict
      ? [
          `foundPlayer "${queuePlayerInfo.foundPlayer ?? 'unknown'}" conflicts with expected finder "${expectedPlayerInfo.foundPlayer ?? 'unknown'}" (planter of round #${targetRound + 1})`,
        ]
      : [],
    comparePreview: {
      mysteryImageUrl: mysteryUrl,
      candidateFoundUrl: image.url,
      expectedFoundPlayer: expectedPlayerInfo.foundPlayer,
      queueFoundPlayer: queuePlayerInfo.foundPlayer,
      expectedFoundPlayerId: expectedPlayerInfo.playerId,
      queueFoundPlayerId: queuePlayerInfo.playerId,
      playerVerified: playerMatch.verified,
      playerConflict: playerMatch.conflict,
    },
  }
}

/** Validates a past-round queue found image that should have been copied into main/. */
export const evaluateOrphanedQueueFoundForMain = (
  image: QueueStorageImage,
  main: MainFolderContext,
  simulatedQueue: Tag[] = [],
): OrphanedQueueFoundCheck => {
  const currentTag = main.currentTag
  const keyRound = parseTagnumberFromQueueKey(image.key) ?? image.tagnumber

  if (currentTag?.tagnumber === undefined) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      reasons: ['current round is unknown'],
    }
  }

  const orphanTargets = resolveOrphanTargetsForImage(image, currentTag.tagnumber)
  if (!orphanTargets.length) {
    return {
      structural: false,
      playerVerified: false,
      playerConflict: false,
      targetRound: keyRound,
      reasons: [
        isCurrentRoundQueueFoundSubmission(keyRound, image.metadataTagnumber, currentTag.tagnumber)
          ? 'current-round queue submission — not an orphan'
          : 'filename and metadata do not indicate a past-round orphan',
      ],
    }
  }

  return evaluateOrphanedQueueFoundForTarget(image, orphanTargets[0], main, simulatedQueue)
}

const listQueueObjectKeys = async (
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> => {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )
    keys.push(
      ...((response.Contents?.map((obj) => obj.Key)
        .filter((key): key is string => !!key?.length && !isStoragePrefixMarkerKey(key)) ??
        []) as string[]),
    )
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

const parseQueueImageKey = (key: string) => {
  if (isQueueSizedVariantKey(key)) return undefined
  if (key.endsWith('/index.json')) return undefined

  const match = key.match(queuePrimaryImageKeyPattern)
  if (!match) return undefined

  const [, , type, playerHash = '', extension] = match
  const tagnumber = parseTagnumberFromQueueKey(key)
  if (tagnumber === undefined) return undefined

  return {
    type: type as 'found' | 'mystery',
    playerHash,
    extension: extension.toLowerCase(),
    tagnumber,
  }
}

/**
 * List and parse all objects under queue/. One HeadObject per primary file for S3 metadata (t, mp, fp).
 * Filename round comes from key; metadataTagnumber from object metadata when present.
 */
export const loadQueueStorageImages = async (
  game: string,
  region: string,
): Promise<{
  bucket: string
  keys: string[]
  images: QueueStorageImage[]
  unparsedKeys: string[]
}> => {
  const client = createQueueStorageClient(region)
  const bucket = `${game.toLowerCase()}-biketag`
  const keys = await listQueueObjectKeys(client, bucket, 'queue/')
  const images: QueueStorageImage[] = []
  const unparsedKeys: string[] = []

  for (const key of keys) {
    const parsed = parseQueueImageKey(key)
    if (!parsed) {
      if (
        /^queue\//.test(key) &&
        !key.endsWith('/index.json') &&
        !isQueueSizedVariantKey(key) &&
        !isStoragePrefixMarkerKey(key)
      ) {
        unparsedKeys.push(key)
      }
      continue
    }

    const { type, playerHash, extension, tagnumber: tagnumberFromKey } = parsed

    let playerId: string | undefined
    let mysteryPlayer: string | undefined
    let foundPlayer: string | undefined
    const tagnumber = tagnumberFromKey
    let metadataTagnumber: number | undefined
    let title: string | undefined
    let description: string | undefined

    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      title = head.Metadata?.title ? decodeQueueMetadataValue(head.Metadata.title) : undefined
      description = head.Metadata?.description
        ? decodeQueueMetadataValue(head.Metadata.description)
        : undefined
      const meta = parseQueueObjectMetadata(head.Metadata?.data)
      if (meta) {
        playerId = meta.playerId
        mysteryPlayer = meta.mysteryPlayer
        foundPlayer = meta.foundPlayer
        metadataTagnumber = meta.tagnumber
      }
    } catch {
      // keep key-derived values
    }

    const baseKey = key.replace(/\.(webp|jpe?g|png|gif|bmp)$/i, '').replace(/_(medium|small)$/i, '')

    images.push({
      key,
      url: `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${key}`,
      baseKey,
      type,
      tagnumber,
      metadataTagnumber,
      playerHash,
      extension,
      playerId,
      mysteryPlayer,
      foundPlayer,
      title,
      description,
    })
  }

  return { bucket, keys, images, unparsedKeys }
}

/** List object keys under main/ (no parsing). Used for orphan detection only. */
export const loadMainStorageKeys = async (game: string, region: string): Promise<string[]> => {
  const client = createQueueStorageClient(region)
  const bucket = `${game.toLowerCase()}-biketag`
  return listQueueObjectKeys(client, bucket, 'main/')
}

export const getQueueImageFromStorage = (
  images: QueueStorageImage[] = [],
  primaryKey: string,
): QueueStorageImage | undefined => images.find((image) => image.key === primaryKey)

const getStorageUploaderKey = (image: QueueStorageImage): string | undefined => {
  if (image.playerId?.length) return `id:${image.playerId}`
  const name = (image.mysteryPlayer || image.foundPlayer || '').trim().toLowerCase()
  if (name.length) return `name:${name}`
  if (image.playerHash?.length) return `hash:${image.playerHash}`
  return `tag:${image.tagnumber}-${image.type}`
}

/**
 * Build synthetic Tag[] from queue/ files (highest round ±1, grouped by uploader).
 * Approximates what biketag getQueue returns without calling queue/index.json.
 */
export const simulateGetQueueTagsFromStorage = (
  images: QueueStorageImage[] = [],
  game = '',
): Tag[] => {
  const byTagnumber = new Map<number, QueueStorageImage[]>()

  for (const image of images) {
    byTagnumber.set(image.tagnumber, [...(byTagnumber.get(image.tagnumber) ?? []), image])
  }

  const tagnumbers = [...byTagnumber.keys()].sort((a, b) => a - b)
  if (!tagnumbers.length) return []

  const highest = tagnumbers[tagnumbers.length - 1]
  const relevantTagnumbers = [highest, highest - 1].filter((n) => n > 0 && byTagnumber.has(n))
  const playerImages = new Map<string, QueueStorageImage[]>()

  for (const tagnumber of relevantTagnumbers) {
    for (const image of byTagnumber.get(tagnumber) ?? []) {
      const key = getStorageUploaderKey(image)
      if (!key) continue
      playerImages.set(key, [...(playerImages.get(key) ?? []), image])
    }
  }

  const tags: Tag[] = []
  for (const group of playerImages.values()) {
    const mystery = group.find((image) => image.type === 'mystery')
    const found = group.find((image) => image.type === 'found')
    const tagnumber = mystery?.tagnumber ?? found?.tagnumber ?? 0

    tags.push({
      tagnumber,
      game,
      playerId: mystery?.playerId ?? found?.playerId,
      mysteryPlayer: mystery?.mysteryPlayer,
      foundPlayer: found?.foundPlayer,
      mysteryImageUrl: mystery?.url,
      foundImageUrl: found?.url,
    } as Tag)
  }

  return tags
}

/**
 * Scan queue/ images and return all detected issues. Read-only except issue list.
 *
 * Order per image: orphaned-main-found (if main context) → wrong-round → non-webp →
 * missing-variants. Then bucket-level duplicate-uploader checks.
 *
 * Orphan is shown when evaluateOrphanedQueueFoundForTarget.structural is true (main missing
 * --found, mystery exists for comparison). Player mismatch marks repairable:false but still shown.
 */
export const collectQueueIssuesFromStorage = (
  images: QueueStorageImage[] = [],
  allKeys: string[] = [],
  currentTag?: Tag,
  simulatedQueue: Tag[] = [],
  unparsedKeys: string[] = [],
  main?: MainFolderContext,
): QueueIssue[] => {
  const issues: QueueIssue[] = []
  const keySet = new Set(allKeys)
  const reportedDuplicateHashes = new Set<string>()
  const orphanedKeys = new Set<string>()

  for (const key of unparsedKeys) {
    const tagnumber = parseTagnumberFromQueueKey(key) ?? 0
    const filename = key.split('/').pop() || key
    issues.push({
      category: 'non-webp',
      tagnumber,
      issue: `unrecognized queue file: ${filename}`,
      url: key,
    })
  }

  for (const image of images) {
    const player = image.foundPlayer || image.mysteryPlayer || image.playerHash

    if (main && currentTag?.tagnumber) {
      const keyRound = parseTagnumberFromQueueKey(image.key) ?? image.tagnumber
      const orphanTargets = resolveOrphanTargetsForImage(image, currentTag.tagnumber)

      for (const targetRound of orphanTargets) {
        if (orphanedKeys.has(image.key)) break

        const orphaned = evaluateOrphanedQueueFoundForTarget(
          image,
          targetRound,
          main,
          simulatedQueue,
        )
        if (!orphaned.structural || !orphaned.comparePreview) continue

        orphanedKeys.add(image.key)
        const roundNote =
          keyRound !== targetRound && image.metadataTagnumber === targetRound
            ? ` — metadata says found for round #${targetRound}, filename uses new-round #${keyRound}`
            : keyRound !== targetRound
              ? ` — filename says round #${keyRound}, main/ is missing found for round #${targetRound}`
              : image.metadataTagnumber !== undefined && image.metadataTagnumber !== targetRound
                ? ` (metadata lists round #${image.metadataTagnumber})`
                : ''
        const finder =
          orphaned.comparePreview.queueFoundPlayer ??
          orphaned.comparePreview.expectedFoundPlayer ??
          player
        const playerNote = orphaned.playerConflict
          ? ' — player name/id conflicts with expected finder; review images before moving'
          : orphaned.playerVerified
            ? ` — matches expected finder "${orphaned.comparePreview.expectedFoundPlayer}"`
            : ' — player could not be verified from metadata; compare images before moving'
        issues.push({
          category: 'orphaned-main-found',
          tagnumber: targetRound,
          playerId: image.playerId ?? orphaned.comparePreview.expectedFoundPlayerId,
          player: finder,
          type: 'found',
          url: image.url,
          key: image.key,
          repairable: !orphaned.playerConflict,
          targetTagnumber: targetRound,
          metadataTagnumber: image.metadataTagnumber,
          comparePreview: orphaned.comparePreview,
          issue: `main/ is missing the found photo for round #${targetRound}${roundNote}${playerNote} — compare tag #${targetRound} mystery with the queue candidate`,
        })
      }
    }

    const expectedRound = getAllowedQueueRoundForImage(currentTag, image.type)

    if (
      !orphanedKeys.has(image.key) &&
      expectedRound !== undefined &&
      !isAllowedQueueRoundForImage(currentTag, image.type, image.tagnumber)
    ) {
      issues.push({
        category: 'wrong-round',
        tagnumber: image.tagnumber,
        playerId: image.playerId,
        player,
        type: image.type,
        url: image.url,
        key: image.key,
        deletable: true,
        issue: `queue file is for round #${image.tagnumber}, expected round #${expectedRound} (${image.type} image)`,
      })
    }

    if (image.extension !== 'webp') {
      issues.push({
        category: 'non-webp',
        tagnumber: image.tagnumber,
        playerId: image.playerId,
        player,
        type: image.type,
        url: image.url,
        issue: `queue file is ${image.extension}, not webp`,
      })
      continue
    }

    const missing: string[] = []
    if (!keySet.has(`${image.baseKey}_medium.webp`)) {
      missing.push(`${image.baseKey.split('/').pop()}_medium.webp`)
    }
    if (!keySet.has(`${image.baseKey}_small.webp`)) {
      missing.push(`${image.baseKey.split('/').pop()}_small.webp`)
    }

    if (missing.length) {
      issues.push({
        category: 'missing-variants',
        tagnumber: image.tagnumber,
        playerId: image.playerId,
        player,
        type: image.type,
        url: image.url,
        issue: `missing sized variant${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      })
    }
  }

  const uploaderImages = new Map<string, QueueStorageImage[]>()
  for (const image of images) {
    const key = getStorageUploaderKey(image)
    if (!key) continue
    uploaderImages.set(key, [...(uploaderImages.get(key) ?? []), image])
  }

  for (const group of uploaderImages.values()) {
    const tagnumbers = [...new Set(group.map((image) => image.tagnumber))].sort((a, b) => a - b)
    if (tagnumbers.length <= 1 || isNormalFoundMysteryPair(group)) continue

    const example = group[0]
    const player = example.foundPlayer || example.mysteryPlayer || example.playerHash
    issues.push({
      category: 'duplicate-uploader',
      tagnumber: example.tagnumber,
      playerId: example.playerId,
      player,
      issue: `uploader has queue files across rounds #${tagnumbers.join(', #')}`,
      relatedTagnumbers: tagnumbers,
    })
  }

  const hashToSimulatedTags = new Map<string, Tag[]>()
  for (const tag of simulatedQueue) {
    for (const image of images) {
      if (image.url !== tag.mysteryImageUrl && image.url !== tag.foundImageUrl) continue
      const existing = hashToSimulatedTags.get(image.playerHash) ?? []
      if (!existing.some((entry) => entry.tagnumber === tag.tagnumber)) {
        hashToSimulatedTags.set(image.playerHash, [...existing, tag])
      }
    }
  }

  for (const [playerHash, tags] of hashToSimulatedTags) {
    if (tags.length <= 1 || reportedDuplicateHashes.has(playerHash)) continue

    reportedDuplicateHashes.add(playerHash)
    const tagnumbers = [...new Set(tags.map((tag) => tag.tagnumber))].sort((a, b) => a - b)
    const example = tags[0]
    const player = example.foundPlayer || example.mysteryPlayer || playerHash

    issues.push({
      category: 'duplicate-uploader',
      tagnumber: example.tagnumber,
      playerId: example.playerId,
      player,
      issue: `getQueue would group this uploader into ${tags.length} separate tags (rounds #${tagnumbers.join(', #')})`,
      relatedTagnumbers: tagnumbers,
    })
  }

  return issues
}

export const getQueueUploaderKey = (tag: Tag): string | undefined => {
  if (tag.playerId?.length) return `id:${tag.playerId}`
  const name = (tag.mysteryPlayer || tag.foundPlayer || '').trim().toLowerCase()
  return name.length ? `name:${name}` : undefined
}

export const isFixableQueueIssue = (issue: QueueIssue): boolean =>
  issue.category === 'non-webp' || issue.category === 'missing-variants'

export const isDeletableQueueIssue = (issue: QueueIssue): boolean =>
  issue.category === 'wrong-round' && issue.deletable === true && !!issue.key?.length

export const isRepairableQueueIssue = (issue: QueueIssue): boolean =>
  issue.category === 'orphaned-main-found' && issue.repairable === true && !!issue.key?.length

const MAIN_INDEX_KEY = 'main/index.json'

const loadMainTagIndex = async (gameSlug: string, region: string): Promise<Tag[]> => {
  const client = createQueueStorageClient(region)
  const bucket = `${gameSlug.toLowerCase()}-biketag`

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: MAIN_INDEX_KEY }),
    )
    const body = await response.Body?.transformToString('utf-8')
    const index = JSON.parse(body ?? '[]')
    if (!Array.isArray(index)) {
      throw new Error('invalid main index format')
    }
    return index as Tag[]
  } catch (error) {
    if (isStorageObjectNotFound(error)) return []
    throw error
  }
}

const saveMainTagIndex = async (gameSlug: string, region: string, tags: Tag[]): Promise<void> => {
  const client = createQueueStorageClient(region)
  const bucket = `${gameSlug.toLowerCase()}-biketag`

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: MAIN_INDEX_KEY,
      Body: JSON.stringify(tags),
      ContentType: 'application/json',
      ACL: 'public-read',
      CacheControl: 'no-cache, no-store, must-revalidate',
    }),
  )
}

/**
 * Patch found fields on one main/index.json entry. Never touches storage objects.
 * Refuses if foundImageUrl already points at main/ (no index overwrite).
 * Do NOT use biketag updateTag for Move to main — see completeOrphanedQueueFoundMoveToMain.
 */
const patchMainTagFoundFieldsIfAbsent = async (
  gameSlug: string,
  region: string,
  tagnumber: number,
  patch: Partial<Tag>,
): Promise<{ success: boolean; error?: string; tag?: Tag }> => {
  try {
    const index = await loadMainTagIndex(gameSlug, region)
    const entryIndex = index.findIndex((tag) => tag.tagnumber === tagnumber)
    if (entryIndex === -1) {
      return { success: false, error: `main index has no entry for tag #${tagnumber}` }
    }

    const existing = index[entryIndex]
    if (foundImageUrlPointsToMain(existing.foundImageUrl)) {
      return {
        success: false,
        error: `main index tag #${tagnumber} already has foundImageUrl in main/ — refusing to overwrite`,
      }
    }

    const updated = { ...existing, ...patch, tagnumber } as Tag
    index[entryIndex] = updated
    await saveMainTagIndex(gameSlug, region, index)
    return { success: true, tag: updated }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'failed to patch main index',
    }
  }
}

/**
 * Repair: copy one orphaned queue found image into main/ for targetRound, then patch index.
 *
 * Preconditions (when main context provided):
 *   - evaluateOrphanedQueueFoundForTarget passes (structural, no player conflict)
 *   - main/{game}-tag-{targetRound}--found.webp does not already exist
 *
 * Storage steps:
 *   1. copyQueueFoundToMainIfAbsent — never overwrites main/ storage
 *   2. patchMainTagFoundFieldsIfAbsent — sets found fields only when index has no main found URL
 *
 * Never calls biketag updateTag. Never overwrites existing main/ files or index found URLs.
 * targetRoundOverride is required — never derived from filename alone.
 */
export const completeOrphanedQueueFoundMoveToMain = async (
  game: Game,
  gameSlug: string,
  queueImage: QueueStorageImage,
  biketag: BikeTagClient,
  imageSource: string,
  main?: MainFolderContext,
  targetRoundOverride?: number,
): Promise<{ success: boolean; error?: string; mainUrl?: string }> => {
  if (targetRoundOverride === undefined) {
    return {
      success: false,
      error:
        'target round is required — never infer from queue filename alone (misfiled orphans use metadata round)',
    }
  }

  const targetRound = targetRoundOverride

  if (!game.awsRegion?.length) {
    return { success: false, error: 'game has no aws region configured' }
  }

  if (queueImage.type !== 'found') {
    return { success: false, error: 'only queue found images can be moved to main via this repair' }
  }

  const keyRound = parseTagnumberFromQueueKey(queueImage.key) ?? queueImage.tagnumber
  if (keyRound !== targetRound && queueImage.metadataTagnumber !== targetRound) {
    return {
      success: false,
      error: `target round #${targetRound} does not match queue filename #${keyRound} or metadata #${queueImage.metadataTagnumber ?? 'none'}`,
    }
  }

  if (main) {
    const check = evaluateOrphanedQueueFoundForTarget(queueImage, targetRound, main)
    if (!check.structural) {
      return {
        success: false,
        error:
          check.reasons.join('; ') || 'queue found image failed orphaned-main-found validation',
      }
    }
    if (check.playerConflict) {
      return {
        success: false,
        error:
          check.reasons.join('; ') ||
          'queue found image player conflicts with expected finder for this round',
      }
    }

    const foundKey = getMainFoundFileKey(gameSlug, targetRound)
    if (main.mainKeys.includes(foundKey)) {
      return {
        success: false,
        error: `${foundKey} already exists in main/ — refusing to overwrite existing storage files`,
      }
    }
  } else {
    const mainKeys = await loadMainStorageKeys(gameSlug, game.awsRegion)
    const foundKey = getMainFoundFileKey(gameSlug, targetRound)
    if (mainKeys.includes(foundKey)) {
      return {
        success: false,
        error: `${foundKey} already exists in main/ — refusing to overwrite existing storage files`,
      }
    }
  }

  let mainUrl: string
  try {
    log('[queue-fix] Starting orphaned queue found move to main', {
      queueKey: queueImage.key,
      queueUrl: queueImage.url,
      extension: queueImage.extension,
      targetRound,
      keyRound,
      metadataTagnumber: queueImage.metadataTagnumber,
    })
    mainUrl = await copyQueueFoundToMainIfAbsent(
      gameSlug,
      game.awsRegion,
      queueImage.url,
      targetRound,
    )
    log('[queue-fix] Copied queue found image into main storage', { targetRound, mainUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to copy queue found image to main'
    log('[queue-fix] Failed to copy queue found image to main', { queueKey: queueImage.key, targetRound, error: message }, 'error')
    return {
      success: false,
      error: message,
    }
  }

  const mainTagResponse = await biketag.getTag({ tagnumber: targetRound }, { source: imageSource })
  const fetchedTag = mainTagResponse.success ? (mainTagResponse.data as Tag) : undefined
  const identity = getMainTagIdentity(gameSlug, targetRound)

  // Patch main/index.json only when found URL not already set. Storage copy above is the sole main/ object write.
  const patchResult = await patchMainTagFoundFieldsIfAbsent(gameSlug, game.awsRegion, targetRound, {
    ...identity,
    game: gameSlug,
    foundImageUrl: mainUrl,
    foundPlayer: queueImage.foundPlayer || fetchedTag?.foundPlayer,
    playerId: queueImage.playerId || fetchedTag?.playerId,
  })

  if (!patchResult.success) {
    const existingUrl = fetchedTag?.foundImageUrl ?? main?.mainTagsByRound.get(targetRound)?.foundImageUrl
    const existingKey = existingUrl ? getStorageKeyFromUrl(existingUrl) : ''
    const expectedKey = getMainFoundFileKey(gameSlug, targetRound)
    if (
      patchResult.error?.includes('already has foundImageUrl in main/') &&
      existingKey === expectedKey
    ) {
      log('[queue-fix] Main index already references repaired found file — treating as success', {
        targetRound,
        mainUrl,
        existingKey,
      })
      return { success: true, mainUrl }
    }

    log('[queue-fix] Failed to patch main index after copy', {
      targetRound,
      mainUrl,
      error: patchResult.error,
    }, 'error')
    return {
      success: false,
      error: patchResult.error ?? 'failed to update main tag index',
      mainUrl,
    }
  }

  return { success: true, mainUrl }
}

export const getQueueImageDeleteKeys = (primaryKey: string, allKeys: string[] = []): string[] => {
  const base = primaryKey.replace(/\.(webp|jpe?g|png|gif|bmp)$/i, '')
  const candidates = [
    primaryKey,
    `${base}.webp`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.png`,
    `${base}_medium.webp`,
    `${base}_small.webp`,
  ]
  const unique = [...new Set(candidates)]
  if (!allKeys.length) return unique
  const keySet = new Set(allKeys)
  return unique.filter((key) => keySet.has(key))
}

/** Delete primary queue image and its _medium/_small variants from queue/ only. */
export const deleteQueueImageGroupFromStorage = async (
  gameSlug: string,
  region: string,
  primaryKey: string,
  allKeys: string[] = [],
): Promise<{ deleted: string[] }> => {
  const client = createQueueStorageClient(region)
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const keys = getQueueImageDeleteKeys(primaryKey, allKeys)
  const deleted: string[] = []

  for (const key of keys) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      deleted.push(key)
    } catch {
      // object may not exist
    }
  }

  return { deleted }
}

export const summarizeQueueIssues = (issues: QueueIssue[] = []) => {
  const summary: Record<QueueIssueCategory, number> = {
    'non-webp': 0,
    'missing-variants': 0,
    'wrong-round': 0,
    'duplicate-uploader': 0,
    'orphaned-main-found': 0,
  }

  for (const issue of issues) {
    summary[issue.category]++
  }

  return summary
}

export async function collectQueueIssuesFromTags(
  queue: Tag[] = [],
  currentTag?: Tag,
): Promise<QueueIssue[]> {
  const issues: QueueIssue[] = []

  for (const tag of queue) {
    const player = tag.foundPlayer || tag.mysteryPlayer
    const imageFields: Array<{ type: 'found' | 'mystery'; url?: string }> = [
      { type: 'found', url: tag.foundImageUrl },
      { type: 'mystery', url: tag.mysteryImageUrl },
    ]

    for (const { type, url } of imageFields) {
      if (!url?.length || !queuePathPattern.test(url)) continue

      const storageKey = getStorageKeyFromUrl(url)
      const imageRound = parseTagnumberFromQueueKey(storageKey)
      const expectedRound = getAllowedQueueRoundForImage(currentTag, type)

      if (
        expectedRound !== undefined &&
        imageRound !== undefined &&
        !isAllowedQueueRoundForImage(currentTag, type, imageRound)
      ) {
        issues.push({
          category: 'wrong-round',
          tagnumber: imageRound,
          playerId: tag.playerId,
          player,
          type,
          url,
          key: storageKey,
          deletable: true,
          issue: `queue file is for round #${imageRound}, expected round #${expectedRound} (${type} image)`,
        })
      }

      if (nonWebpImagePattern.test(url)) {
        issues.push({
          category: 'non-webp',
          tagnumber: tag.tagnumber,
          playerId: tag.playerId,
          player,
          type,
          url,
          issue: 'queue image is not webp',
        })
      }
    }
  }

  const uploaderTags = new Map<string, Tag[]>()
  for (const tag of queue) {
    const key = getQueueUploaderKey(tag)
    if (!key) continue
    uploaderTags.set(key, [...(uploaderTags.get(key) ?? []), tag])
  }

  for (const tags of uploaderTags.values()) {
    if (tags.length <= 1) continue

    const tagnumbers = [...new Set(tags.map((tag) => tag.tagnumber))].sort((a, b) => a - b)
    const exampleTag = tags[0]
    const player = exampleTag.foundPlayer || exampleTag.mysteryPlayer

    issues.push({
      category: 'duplicate-uploader',
      tagnumber: exampleTag.tagnumber,
      playerId: exampleTag.playerId,
      player,
      issue:
        tagnumbers.length > 1
          ? `uploader has ${tags.length} queue entries across rounds #${tagnumbers.join(', #')}`
          : `uploader has ${tags.length} separate queue entries for round #${tagnumbers[0]}`,
      relatedTagnumbers: tagnumbers,
    })
  }

  return issues
}

export const getQueueImageUrlIssues = (tags: Tag[] = []) => {
  const issues: Array<{
    tagnumber: number
    playerId?: string
    foundPlayer?: string
    type: 'found' | 'mystery'
    url: string
    issue: string
  }> = []

  for (const tag of tags) {
    const imageFields: Array<{ type: 'found' | 'mystery'; url?: string }> = [
      { type: 'found', url: tag.foundImageUrl },
      { type: 'mystery', url: tag.mysteryImageUrl },
    ]

    for (const { type, url } of imageFields) {
      if (!url?.length) continue
      if (!/\/queue\//.test(url)) continue

      if (nonWebpImagePattern.test(url)) {
        issues.push({
          tagnumber: tag.tagnumber,
          playerId: tag.playerId,
          foundPlayer: tag.foundPlayer,
          type,
          url,
          issue: 'webp conversion failed or pending',
        })
      }
    }
  }

  return issues
}

export const getMainImageUrlIssues = (tags: Tag | Tag[] = []) => {
  const tagList = Array.isArray(tags) ? tags : [tags]
  const issues: Array<{
    tagnumber: number
    playerId?: string
    foundPlayer?: string
    type: 'found' | 'mystery'
    url: string
    issue: string
  }> = []

  for (const tag of tagList) {
    if (!tag) continue

    const imageFields: Array<{ type: 'found' | 'mystery'; url?: string }> = [
      { type: 'found', url: tag.foundImageUrl },
      { type: 'mystery', url: tag.mysteryImageUrl },
    ]

    for (const { type, url } of imageFields) {
      if (!url?.length) continue
      if (!/\/main\//.test(url)) continue

      if (nonWebpImagePattern.test(url)) {
        issues.push({
          tagnumber: tag.tagnumber,
          playerId: tag.playerId,
          foundPlayer: tag.foundPlayer,
          type,
          url,
          issue: 'main folder must use webp',
        })
      }
    }
  }

  return issues
}

export const getMainFolderUpdateOpts = (game: Game, imageSource: string, resize = false) => {
  if (imageSource !== 'aws') {
    return { source: imageSource }
  }

  return {
    source: imageSource,
    resize,
    host: getQueueApiHost(game.name),
    region: game.awsRegion,
    folder: 'main',
    game: getGameStorageSlug(game),
  }
}

export const coerceBooleanQueryParam = (value: unknown): boolean | undefined => {
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return undefined
}

export const getQueueApiHost = (game = ''): string => getApiUrl(game, '').replace(/\/$/, '')

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
      if (e.code === 'ERR_JWT_EXPIRED') {
        log('Auth0 JWT expired', e, 'warn')
        return null
      }
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
    log(ErrorMessage.NoHtmlLoaded, { templateFilePath, htmlTemplateFilePath }, 'error')
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
      log(`sending ${emailName} email to BikeTag Ambassador`, { email: ambassador.email }, 'info')
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
      log(`sending ${emailName} email to BikeTag Administrator:`, { biketagAdminEmail }, 'info')
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
    if (gameResponse.success) {
      game = gameResponse.data
    } else {
      return { results: [{ message: ErrorMessage.GameNotSet, game: undefined }], errors: true }
    }
  }

  const imageSource = getImageSource(game)

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
  const imageSource = getImageSource(game)

  log('Evaluating active queue for game', { game: game.name, autoPostSetting, imageSource }, 'info')

  if (
    (autoPostSetting && (game.queuehash?.length || game.awsRegion?.length)) ||
    approvingAmbassadorIsApproved
  ) {
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
            log(
              'Tag timed out',
              { tagnumber: t.tagnumber, mysteryTime: t.mysteryTime, diff },
              'info',
            )
          } else {
            log('Tag not timed out', { now, mysteryTime: t.mysteryTime, diff }, 'info')
          }
          return isTimedOut
        })

        if (timedOutTags.length) {
          timedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
        }
      }
    }
  } else {
    log(
      'Auto-post setting incomplete and no approving ambassador, skipping queue processing',
      { game: game.name },
      'error',
    )
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
              log('creating the player in sanity', { data, biketagAdminOpts })
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
          log(ErrorMessage.InvalidRequestData, { data, profileType }, 'error')
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
          if (response.data?.length)
            log('well how did this happen?', { 'response.data': response.data }, 'warn')
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
    log(ErrorMessage.ImageUploadFailed, { uploadResponse }, 'error')
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
  const imageSource = getImageSource(game)
  const imageUrl = getImageSized(imageSource, winningTag.mysteryImageUrl, 'm')

  try {
    if (process.env.BSKY_USER && process.env.BSKY_PASS) {
      const bskyUser = process.env.BSKY_USER
      const bskyPass = process.env.BSKY_PASS
      const bskyServer = process.env.BSKY_SERVER ?? 'https://bsky.social'

      log('sending bluesky on behalf of ' + bskyUser, { winningTagnumber, bskyUser })

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
    log('error sending bluesky notification', { blueskyError: e }, 'error')
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
  const imageSource = getImageSource(game)
  const mysteryImageUrl = getImageSized(imageSource, winningTag.mysteryImageUrl, 'l')
  const foundImageUrl = getImageSized(imageSource, currentTag.foundImageUrl, 'l')

  log('sending notification webhook timestamp', {
    timestamp,
    foundTime: currentTag.foundTime,
    tz: game.region.tz,
  })

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
  const host = getGameSiteUrl(game.name)
  const socialLinks = getGameSocialLinks(game)
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
          gameHost: host,
          redditLink: socialLinks.redditLink,
          blueskyLink: socialLinks.blueskyLink,
          instagramLink: socialLinks.instagramLink,
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

export const finalizeNewBikeTagPost = async (
  game: Game,
  winningBikeTagPost: Tag,
  previousBikeTag: Tag,
  adminBiketag?: BikeTagClient,
  nonAdminBiketag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))
  const imageSource = getImageSource(game)
  previousBikeTag =
    previousBikeTag ?? ((await adminBiketag.getTag(undefined, { source: imageSource })).data as Tag)
  let errors = false
  const results: any = []

  const gameSlug = getGameStorageSlug(game)
  const newBikeTagPost = BikeTagClient.getters.getOnlyMysteryTagFromTagData(winningBikeTagPost)
  if (winningBikeTagPost.playerId) {
    newBikeTagPost.playerId = winningBikeTagPost.playerId
  }
  newBikeTagPost.game = gameSlug
  newBikeTagPost.gps = { lat: 0, long: 0, alt: 0 }
  previousBikeTag.game = gameSlug
  previousBikeTag.gps = winningBikeTagPost.gps
  previousBikeTag.foundPlayer = winningBikeTagPost.foundPlayer
  previousBikeTag.foundTime = winningBikeTagPost.foundTime
  previousBikeTag.foundLocation = winningBikeTagPost.foundLocation

  if (imageSource === 'aws' && game.awsRegion?.length) {
    if (winningBikeTagPost.foundImageUrl?.length) {
      await requireQueueImageVariants(game, winningBikeTagPost.foundImageUrl, 'Found')
      previousBikeTag.foundImageUrl = await moveQueueImageToMainWithVariants(
        gameSlug,
        game.awsRegion,
        winningBikeTagPost.foundImageUrl,
        previousBikeTag.tagnumber,
        'found',
      )
    }
    if (winningBikeTagPost.mysteryImageUrl?.length) {
      await requireQueueImageVariants(game, winningBikeTagPost.mysteryImageUrl, 'Mystery')
      newBikeTagPost.mysteryImageUrl = await moveQueueImageToMainWithVariants(
        gameSlug,
        game.awsRegion,
        winningBikeTagPost.mysteryImageUrl,
        newBikeTagPost.tagnumber,
        'mystery',
      )
    }
  } else {
    previousBikeTag.foundImageUrl = winningBikeTagPost.foundImageUrl
  }

  const mainUpdateOpts = getMainFolderUpdateOpts(game, imageSource, false)

  log('Updating current BikeTag with winning tag found info', previousBikeTag, 'info')
  const currentBikeTagUpdateResult = await adminBiketag.updateTag(previousBikeTag, mainUpdateOpts)
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

  const newBikeTagUpdateResult = await adminBiketag.updateTag(newBikeTagPost, mainUpdateOpts)
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
        error: deleteWinningTagFromQueueResult.error,
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

export const launchGameTag = async (
  game: Game,
  launchTag: Tag,
  adminBiketag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  adminBiketag =
    adminBiketag ?? new BikeTagClient(getBikeTagClientOpts(undefined, true, true, game))
  const imageSource = getImageSource(game)
  const gameSlug = getGameStorageSlug(game)

  if (!launchTag.mysteryImageUrl?.length) {
    return {
      results: [
        { message: 'Mystery image is required to launch the game', error: 'missing image' },
      ],
      errors: true,
    }
  }

  const sourceKey = getStorageKeyFromUrl(launchTag.mysteryImageUrl)
  if (!sourceKey.startsWith('main/')) {
    return {
      results: [
        {
          message: 'Mystery image must be uploaded directly to main storage',
          error: 'invalid image location',
        },
      ],
      errors: true,
    }
  }

  const newTag = BikeTagClient.getters.getOnlyMysteryTagFromTagData(launchTag)
  newTag.tagnumber = 1
  newTag.game = gameSlug
  newTag.gps = { lat: 0, long: 0, alt: 0 }
  newTag.mysteryImageUrl = launchTag.mysteryImageUrl
  if (!newTag.mysteryTime) {
    newTag.mysteryTime = Math.floor(Date.now() / 1000)
  }

  if (imageSource === 'aws' && game.awsRegion?.length) {
    try {
      const index = await loadMainTagIndex(gameSlug, game.awsRegion)
      if (index.some((t) => (t.tagnumber ?? 0) >= 1)) {
        return {
          results: [
            {
              message: 'main/index.json already has tag #1',
              error: 'tag already exists',
            },
          ],
          errors: true,
        }
      }
      await saveMainTagIndex(gameSlug, game.awsRegion, [...index, newTag])
      log('Created main/index.json with tag #1', { game: gameSlug, tag: newTag.tagnumber }, 'info')
    } catch (err: any) {
      return {
        results: [{ message: 'Failed to create main index', error: err.message ?? String(err) }],
        errors: true,
      }
    }

    const mainUpdateOpts = getMainFolderUpdateOpts(game, imageSource, true)
    const resizeResult = await adminBiketag.updateTag(newTag, mainUpdateOpts)
    log('Result of launch tag #1 resize', resizeResult, 'info')
    if (!resizeResult.success) {
      log('main index created but image resize failed', { error: resizeResult.error }, 'warn')
      return {
        results: [
          {
            message: 'main index created but image resize failed',
            error: resizeResult.error,
            game: game.name,
            tag: newTag,
          },
        ],
        errors: true,
      }
    }

    axios
      .post(
        getApiUrl(game.name, 'autopost-notify'),
        {},
        { headers: { 'Content-Type': 'application/json' } },
      )
      .catch((e) => log(ErrorMessage.NotificationsNotSent, e.message ?? e, 'warn'))

    return {
      results: [
        {
          message: 'game launched with tag #1',
          game: game.name,
          tag: resizeResult.success ? resizeResult.data : newTag,
        },
      ],
      errors: false,
    }
  }

  const mainUpdateOpts = getMainFolderUpdateOpts(game, imageSource, true)
  const newBikeTagUpdateResult = await adminBiketag.updateTag(newTag, mainUpdateOpts)
  log('Result of launch tag #1 update', newBikeTagUpdateResult, 'info')

  if (newBikeTagUpdateResult.success) {
    axios
      .post(
        getApiUrl(game.name, 'autopost-notify'),
        {},
        { headers: { 'Content-Type': 'application/json' } },
      )
      .catch((e) => log(ErrorMessage.NotificationsNotSent, e.message ?? e, 'warn'))

    return {
      results: [
        {
          message: 'game launched with tag #1',
          game: game.name,
          tag: newBikeTagUpdateResult.data,
        },
      ],
      errors: false,
    }
  }

  return {
    results: [
      {
        message: ErrorMessage.BikeTagNotPosted,
        error: newBikeTagUpdateResult.error,
        game: game.name,
        tag: newTag,
      },
    ],
    errors: true,
  }
}

export const setNewBikeTagPost = async (
  game: Game,
  winningBikeTagPost: Tag,
  previousBikeTag: Tag,
  adminBiketag?: BikeTagClient,
  nonAdminBiketag?: BikeTagClient,
): Promise<BackgroundProcessResults> => {
  const gameSlug = getGameStorageSlug(game)
  winningBikeTagPost = { ...winningBikeTagPost, game: gameSlug }

  try {
    return await finalizeNewBikeTagPost(
      game,
      winningBikeTagPost,
      previousBikeTag,
      adminBiketag,
      nonAdminBiketag,
    )
  } catch (err: any) {
    log('setNewBikeTagPost failed', err, 'error')
    return {
      results: [{ message: 'BikeTag post failed', error: err.message ?? String(err) }],
      errors: true,
    }
  }
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
    log(ErrorMessage.getAuthManagementToken, e.message, 'error')
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
    isBikeTagAdmin: profile.isBikeTagAdmin ?? defaults?.isBikeTagAdmin ?? false,
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

export const getImageSource = (game: Game): 'aws' | 'imgur' => {
  if (game.awsRegion && game.settings['data::aws'] === 'true') {
    return 'aws'
  } else if (game.mainhash?.length) {
    return 'imgur'
  }
  return (process.env.IMAGE_SOURCE ?? 'aws') as 'aws' | 'imgur'
}
