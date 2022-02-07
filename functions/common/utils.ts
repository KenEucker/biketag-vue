import request from 'request'
import { getDomainInfo } from '../../src/common/utils'
import md5 from 'md5'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { Liquid } from 'liquidjs'
import { join, extname } from 'path'
import { readFileSync, existsSync } from 'fs'
import { Ambassador } from 'biketag/lib/common/schema'

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

    opts.sanity = opts.sanity ?? {}
    opts.sanity.projectId = process.env.SANITY_PROJECT_ID
    opts.sanity.dataset = process.env.SANITY_DATASET

    if (admin) {
      opts.imgur = opts.imgur ?? {}
      opts.imgur.clientId = process.env.IMGUR_ADMIN_CLIENT_ID ?? opts.imgur.clientId
      opts.imgur.clientSecret = process.env.IMGUR_ADMIN_CLIENT_SECRET ?? opts.imgur.clientSecret
      opts.imgur.accessToken = process.env.IMGUR_ADMIN_ACCESS_TOKEN ?? ''
      opts.imgur.refreshToken = process.env.IMGUR_ADMIN_REFRESH_TOKEN ?? opts.imgur.refreshToken
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
    root: [join('src', 'emails')],
    customFilters: {
      biketag_image: (url, size = '') => {
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

  if (existsSync(htmlTemplateFilePath)) {
    const htmlTemplate = readFileSync(htmlTemplateFilePath).toString()
    html = liquid.parseAndRenderSync(htmlTemplate, locals)
  }
  if (existsSync(textTemplateFilePath)) {
    const textTemplate = readFileSync(textTemplateFilePath).toString()
    text = liquid.parseAndRenderSync(textTemplate, locals)
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
  sendToSuperAdmin = true,
  template?: string
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
        template ?? emailName
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
          ...getEmailData(),
        },
        template ?? emailName
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
