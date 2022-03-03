import request from 'request'
import { getDomainInfo } from '../../src/common/utils'
import md5 from 'md5'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { Liquid } from 'liquidjs'
import { join, extname } from 'path'
import { readFileSync } from 'fs'
import { Ambassador, Game, Tag } from 'biketag/lib/common/schema'
import { activeQueue, BackgroundProcessResults } from './types'
import { JwtVerifier, getTokenFromHeader } from '@serverless-jwt/jwt-verifier'
import BikeTagClient from 'biketag'
import axios from 'axios'
import Ajv from 'Ajv'
import * as jose from 'jose'

const ajv = new Ajv()
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

    opts.reddit = opts.reddit ?? {}
    opts.reddit.clientId = process.env.REDDIT_CLIENT_ID
    opts.reddit.clientSecret = process.env.REDDIT_CLIENT_SECRET
    /// TODO: comes from sanity game settings
    // opts.reddit.username = process.env.REDDIT_USERNAME
    // opts.reddit.password = process.env.REDDIT_PASSWORD

    opts.sanity = opts.sanity ?? {}
    opts.sanity.projectId = process.env.SANITY_PROJECT_ID
    opts.sanity.dataset = process.env.SANITY_DATASET

    if (admin) {
      opts.imgur.clientId = process.env.IMGUR_ADMIN_CLIENT_ID ?? opts.imgur.clientId
      opts.imgur.clientSecret = process.env.IMGUR_ADMIN_CLIENT_SECRET ?? opts.imgur.clientSecret
      opts.imgur.accessToken = process.env.IMGUR_ADMIN_ACCESS_TOKEN ?? ''
      opts.imgur.refreshToken = process.env.IMGUR_ADMIN_REFRESH_TOKEN ?? opts.imgur.refreshToken

      opts.reddit.clientId = process.env.REDDIT_ADMIN_CLIENT_ID
      opts.reddit.clientSecret = process.env.REDDIT_ADMIN_CLIENT_SECRET
      opts.reddit.username = process.env.REDDIT_ADMIN_USERNAME
      opts.reddit.password = process.env.REDDIT_ADMIN_PASSWORD
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
    case 'profile':
      schema = {
        type: 'object',
        properties: {
          user_metadata: {
            type: 'object',
            properties: {
              name: { type: 'string' },
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

/**
 * Return a JSON response.
 * @param statusCode
 * @param body
 */
const json = (statusCode: number, body: Record<string, unknown>) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

/**
 * Middleware to validate a token and set the user context.
 */
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

      return json(401, {
        error: err.code,
        error_description: err.message,
      })
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

export const getPayloadAuthorization = async (event: any): Promise<any> => {
  const bearer = 'Bearer '
  const clientId = 'Client-ID '
  let authorizationString = event.headers.authorization

  if (authorizationString?.indexOf(bearer) === 0) {
    authorizationString = authorizationString.substr(bearer.length)
  } else if (authorizationString?.indexOf(clientId) === 0) {
    authorizationString = authorizationString.substr(clientId.length)
  }

  if (authorizationString) {
    /// Try netlify Auth validation for BikeTag Ambassador
    // try {
    //   const verifierOpts = { issuer: '', audience: '' }
    //   const verifier = new JwtVerifier(verifierOpts)
    //   return await validateJWT(verifier, verifierOpts)
    // } catch (e) {
    //   console.error({ authorizationNetlifyValidationError: e })
    // }

    /// Try netlify Auth validation for BikeTag Ambassador
    try {
      const JWKS = jose.createRemoteJWKSet(
        new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
      )

      const { payload } = await jose.jwtVerify(authorizationString, JWKS)
      return payload
    } catch (e) {
      console.error({ authorizationAuth0ValidationError: e })
    }
  }
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
    return null
  }
}

export const sendEmail = async (to: string, subject: string, locals: any, template?: string) => {
  template = template ?? subject
  const liquidOpts = {
    dynamicPartials: true,
    strict_filters: true,
    extname: '.liquid',
    // root: [join('functions', 'emails')],
    customFilters: {
      biketag_image: (url = '', size = '') => {
        const ext = extname(url)
        /// Make sure the image type is supported
        if (['.jpg', '.jpeg', '.png', '.bmp'].indexOf(ext) === -1) return url

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
  let html = ''
  let text = ''

  const liquid = new Liquid(liquidOpts)

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
    console.log({ templateFilePath, htmlTemplateFilePath })
  }

  const emailOpts = {
    from: process.env.GOOGLE_EMAIL_ADDRESS, // sender address
    to, // list of receivers
    subject, // subject
    text, // plain text body
    html, // html body
  }

  const transporterOpts: any = {
    auth: {
      user: process.env.GOOGLE_EMAIL_ADDRESS,
      pass: process.env.GOOGLE_PASSWORD,
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
      new Date().getTime() + 1000 * 60 * 60 * 24 * days
    ),
  }
  return encodeURIComponent(encrypt(expiryData))
}

export const sendEmailsToAmbassadors = async (
  emailName: string,
  emailSubject: string,
  ambassadors: Ambassador[],
  getEmailData: (a?: Ambassador) => any,
  sendToSuperAdmin = true
): Promise<{ accepted: any[]; rejected: any[] }> => {
  let emailSent
  const accepted = []
  const rejected = []
  const defaultEmailData = {
    host: 'eh?',
    subdomainIcon: '/images/BikeTag.svg',
  }

  for (const ambassador of ambassadors) {
    if (ambassador.email) {
      console.log(`sending ${emailName} ambassador email to: ${ambassador.email}`)
      emailSent = await sendEmail(
        ambassador.email,
        emailSubject,
        {
          ...defaultEmailData,
          ...getEmailData(ambassador),
        },
        emailName
      )
      accepted.concat(emailSent.accepted)
      rejected.concat(emailSent.rejected)
    }
  }
  if (sendToSuperAdmin) {
    const superAdmin = process.env.SUPER_ADMIN ?? ''
    if (superAdmin?.length) {
      console.log(`sending ${emailName} superAdmin email to: ${superAdmin}`)
      emailSent = await sendEmail(
        superAdmin,
        emailSubject,
        {
          ...defaultEmailData,
          ...getEmailData({ id: superAdmin } as unknown as Ambassador),
        },
        emailName
      )
      accepted.concat(emailSent.accepted)
      rejected.concat(emailSent.rejected)
    }
  }

  return { accepted, rejected }
}

export const getSanityImageUrl = (
  logo: string,
  size = '',
  sanityBaseCDNUrl = 'https://cdn.sanity.io/images/x37ikhvs/production/'
) => {
  const properFilePath = logo.replace('image-', '').replace('-png', '.png').replace('-jpg', '.jpg')
  return `${sanityBaseCDNUrl}${properFilePath}${size.length ? `?${size}` : ''}`
}

export const archiveAndClearQueue = async (
  queuedTags: Tag[],
  game?: Game
): Promise<BackgroundProcessResults> => {
  const results = []
  let errors = false
  const biketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
    true
  )
  const biketag = new BikeTagClient(biketagOpts)
  if (!game) {
    const gameResponse = await biketag.getGame({ game: queuedTags[0].game }, { source: 'sanity' })
    game = gameResponse.success ? gameResponse.data : null
  }
  if (queuedTags.length > 1 && game) {
    const nonAdminBikeTagOpts = getBikeTagClientOpts(
      { method: 'get' } as unknown as request.Request,
      true
    )
    const gameName = game.name.toLocaleLowerCase()
    console.log('archiving remaining queued tags', { game: gameName, queuedTags })
    nonAdminBikeTagOpts.game = gameName
    nonAdminBikeTagOpts.imgur.hash = game.queuehash
    const nonAdminBikeTag = new BikeTagClient(nonAdminBikeTagOpts)

    const remainingQueuedTags = queuedTags.slice(1)
    for (const nonWinningTag of remainingQueuedTags) {
      /* Archive using ambassador credentials (mainhash and archivehash are both ambassador albums) */
      const archiveTagResult = await biketag.archiveTag(nonWinningTag)
      if (archiveTagResult.success) {
        results.push({
          message: 'non-winning found image archived',
          game: gameName,
          tag: nonWinningTag,
        })
      } else {
        console.log({ archiveTagResult })
        results.push({
          message: 'error archiving non-winning found image',
          game: gameName,
          tag: nonWinningTag,
        })
        errors = true
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
        console.log({ deleteArchivedTagFromQueueResult })
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
  adminBikeTagOpts?: any
): Promise<activeQueue> => {
  let queuedTags: Tag[] = []
  let completedTags: Tag[] = []
  let timedOutTags: Tag[] = []

  const autoPostSetting =
    game.settings && !!game.settings['queue::autoPost']
      ? parseInt(game.settings['queue::autoPost'])
      : 0

  // console.log({ autoPostSetting, queuehash: game.queuehash })
  if (autoPostSetting && game.queuehash?.length) {
    /************** GET WINNING QUEUE *****************/
    adminBikeTagOpts =
      adminBikeTagOpts ??
      getBikeTagClientOpts(
        {
          method: 'get',
        } as unknown as request.Request,
        true,
        true
      )
    adminBikeTagOpts.game = game.name.toLocaleLowerCase()
    adminBikeTagOpts.imgur.hash = game.mainhash
    adminBikeTagOpts.imgur.queuehash = game.queuehash
    adminBikeTagOpts.imgur.archivehash = game.archivehash

    const biketag = new BikeTagClient(adminBikeTagOpts)
    const getQueueResponse = await biketag.getQueue(undefined, {
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

export const setNewBikeTagPost = async (
  winningBikeTagPost: Tag,
  game?: Game,
  currentBikeTag?: Tag
): Promise<BackgroundProcessResults> => {
  const biketagOpts = getBikeTagClientOpts(
    { method: 'get' } as unknown as request.Request,
    true,
    true
  )
  biketagOpts.game = game?.name.toLowerCase()
  biketagOpts.imgur.hash = game?.mainhash
  console.log({ biketagOpts })
  const biketag = new BikeTagClient(biketagOpts)
  game = game ?? ((await biketag.game(winningBikeTagPost.game)) as Game)
  currentBikeTag = currentBikeTag ?? ((await biketag.getTag()).data as Tag) // the "current" mystery tag to be updated
  let errors = false
  const results = []

  try {
    if (winningBikeTagPost.discussionUrl) {
      const discussionUrlObject = JSON.parse(winningBikeTagPost.discussionUrl)
      if (discussionUrlObject && typeof discussionUrlObject.postToReddit !== 'undefined') {
        /// TODO: post to Reddit and save the URL here
        winningBikeTagPost.discussionUrl = ''
      }
    }
    if (winningBikeTagPost.mentionUrl) {
      const mentionUrlObject = JSON.parse(winningBikeTagPost.mentionUrl)
      if (mentionUrlObject && typeof mentionUrlObject.postToTwitter === 'undefined') {
        /// TODO: post to Reddit and save the URL here
        winningBikeTagPost.mentionUrl = ''
      }
    }
  } catch (e) {
    winningBikeTagPost.discussionUrl =
      winningBikeTagPost.discussionUrl?.indexOf('postToReddit') > 0
        ? ''
        : winningBikeTagPost.discussionUrl
    winningBikeTagPost.mentionUrl =
      winningBikeTagPost.mentionUrl?.indexOf('postToTwitter') > 0
        ? ''
        : winningBikeTagPost.mentionUrl
  }
  const newBikeTagPost = BikeTagClient.getters.getOnlyMysteryTagFromTagData(winningBikeTagPost) // the new "current" mystery tag
  try {
    /************** UPDATE CURRENT BIKETAG WITH FOUND IMAGE *****************/
    currentBikeTag.foundImageUrl = winningBikeTagPost.foundImageUrl
    currentBikeTag.foundTime = winningBikeTagPost.foundTime
    currentBikeTag.foundLocation = winningBikeTagPost.foundLocation
    currentBikeTag.foundPlayer = winningBikeTagPost.foundPlayer
    console.log('updating current BikeTag with the winning tag found information', currentBikeTag)
    const currentBikeTagUpdateResult = await biketag.updateTag(currentBikeTag)
    console.log({ currentBikeTagUpdateResult })
    if (currentBikeTagUpdateResult.success) {
      results.push({
        message: 'current BikeTag updated',
        game: game.name,
        tag: currentBikeTag,
      })
    } else {
      results.push({
        message: 'current BikeTag was not updated',
        error: currentBikeTagUpdateResult.error,
        game: game.name,
        tag: currentBikeTag,
      })
      errors = true
    }

    /************** SET NEW BIKETAG POST FROM QUEUE *****************/
    const newBikeTagUpdateResult = await biketag.updateTag(newBikeTagPost)
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
      const newPostedBikeTag = newBikeTagUpdateResult.data as unknown as Tag
      const postToReddit = true
      if (postToReddit) {
        const postedToRedditResult = await biketag.updateTag(newPostedBikeTag, { source: 'reddit' })
        if (postedToRedditResult.success) {
          results.push({
            message: 'new BikeTag posted to Reddit',
            game: game.name,
            tag: postedToRedditResult.data,
          })
        } else {
          results.push({
            message: 'new BikeTag was not posted to Reddit',
            error: postedToRedditResult.error,
            game: game.name,
            tag: newPostedBikeTag,
          })
          errors = true
        }
      } else {
        /// TODO: REMOVE LEGACY HACK
        axios
          .get(`https://${game.name}.biketag.org?flushCache=true&resendNotification=true`)
          .catch((e) => {
            /// Unimportant
          })
        ////
      }

      const ambassadors = (await biketag.ambassadors(undefined, {
        source: 'sanity',
      })) as Ambassador[]
      const thisGamesAmbassadors = ambassadors.filter(
        (a) => game.ambassadors.indexOf(a.name) !== -1
      )
      const winningTagnumber = newPostedBikeTag.tagnumber
      const host = `https://${game.name}.biketag.io`
      const logo = game.logo?.length
        ? game.logo.indexOf('imgur.co') !== -1
          ? game.logo
          : getSanityImageUrl(game.logo)
        : `${host}${defaultLogo}`
      await sendEmailsToAmbassadors(
        'biketag-auto-posted',
        `New BikeTag Round (#${winningTagnumber}) Auto-Posted for [${game.name}]`,
        thisGamesAmbassadors,
        (a) => {
          console.log({ a })
          return {
            currentBikeTag: currentBikeTagUpdateResult.data,
            newBikeTagPost: newBikeTagUpdateResult.data,
            logo,
            ambassadorsUrl: `${host}/#/queue?btaId=${a?.id}`,
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
            redditLink: `https://reddit.com/r/${
              game.subreddit?.length ? game.subreddit : 'biketag'
            }`,
            twitterLink: `https://twitter.com/${game.twitter?.length ? game.twitter : 'biketag'}`,
            // instagramLink: `https://www.reddit.com/r/${game. ?? 'biketag'}`,
          }
        }
      )

      /************** REMOVE NEWLY POSTED BIKETAG FROM QUEUE *****************/
      const nonAdminBikeTagOpts = getBikeTagClientOpts(
        {
          method: 'get',
        } as unknown as request.Request,
        true
      )
      nonAdminBikeTagOpts.game = game.name.toLocaleLowerCase()
      nonAdminBikeTagOpts.imgur.hash = game.queuehash
      const nonAdminBikeTag = new BikeTagClient(nonAdminBikeTagOpts)

      const deleteWinningTagFromQueueResult = await nonAdminBikeTag.deleteTag(winningBikeTagPost)
      if (deleteWinningTagFromQueueResult.success) {
        results.push({
          message: 'winning tag deleted from queue',
          game: game.name,
          tag: winningBikeTagPost,
        })
      } else {
        console.log({ deleteQueuedTagResult: deleteWinningTagFromQueueResult })
        results.push({
          message: 'error deleting winning tag from queue',
          game: game.name,
          tag: winningBikeTagPost,
        })
        errors = true
      }
    }
  } catch (e) {
    results.push({
      message: 'error setting new BikeTag Post',
      error: e?.message ?? e,
      game: game.name,
      current: currentBikeTag,
      tag: newBikeTagPost,
    })
    errors = true
  }

  return {
    results,
    errors,
  }
}

export const getWinningTagForCurrentRound = (timedOutTags: Tag[], currentBikeTag: Tag): Tag => {
  if (timedOutTags.length) {
    const orderedTimedOutTags = timedOutTags.sort((t1, t2) => t1.mysteryTime - t2.mysteryTime)
    const winnerWinnerChickenDinner = orderedTimedOutTags[0] // the "first" completed tag in the queue

    if (currentBikeTag.tagnumber === winnerWinnerChickenDinner.tagnumber - 1) {
      return winnerWinnerChickenDinner
    }
  }

  return undefined
}

export const getLoginIsBikeTagAmbassador = (): boolean => {
  return true
}

export const acceptCorsHeaders = (withAuthorization = true) => {
  const corsHeaders = {
    Accept: '*',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Max-Age': '8640',
  }

  if (withAuthorization) {
    corsHeaders['authorization'] = `Bearer ${process.env.AUTH0_TOKEN}`
  }

  return corsHeaders
}
