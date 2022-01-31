import nodemailer from 'nodemailer'
import { Liquid } from 'liquidjs'
import { join, extname } from 'path'
import { readFileSync, existsSync } from 'fs'
import { encrypt, getBikeTagClientOpts, getPayloadOpts } from './common/utils'
import request from 'request'
import BikeTagClient from 'biketag'

export const sendEmailNotification = async (to: string, subject: string, locals: any) => {
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
  const templateFilePath = join('functions', 'emails', subject)
  const htmlTemplateFilePath = `${templateFilePath}.liquid`
  const textTemplateFilePath = `${templateFilePath}--text.liquid`

  if (existsSync(htmlTemplateFilePath)) {
    const htmlTemplate = readFileSync(htmlTemplateFilePath).toString()
    html = liquid.parseAndRenderSync(htmlTemplate, locals)
    console.log({ html })
  } else {
    console.log({ htmlTemplateFilePath })
  }
  if (existsSync(textTemplateFilePath)) {
    const textTemplate = readFileSync(textTemplateFilePath).toString()
    text = liquid.parseAndRenderSync(textTemplate, locals)
    console.log({ text })
  } else {
    console.log({ textTemplateFilePath })
  }
  const emailOpts = {
    from: process.env.GOOGLE_EMAIL_ADDRESS, // sender address
    to, // list of receivers
    subject: subject.replace(/^(.)|[\s-](.)/g, (match) =>
      match[1] !== undefined ? match[1].toUpperCase() : match[0].toUpperCase()
    ),
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

export const getEncodedExpiry = (data = {}) => {
  const expiryDays = 2
  const expiryData = {
    ...data,
    expiry: new Date(
      /// Expiry is now plus  Ms     s    h    days  x (default 2)
      new Date().getTime() + 1000 * 60 * 60 * 24 * expiryDays
    ),
  }
  return encodeURIComponent(encrypt(expiryData))
}

// export const getGameInfo = async (event) => {
//   const biketagOpts = getBikeTagClientOpts(
//     {
//       ...event,
//       method: event.httpMethod,
//     } as unknown as request.Request,
//     true
//   )
//   const biketag = new BikeTagClient(biketagOpts)
//   const game = (await biketag.game(biketagOpts.game, {
//     source: 'sanity',
//     concise: true,
//   })) as unknown as Game
//   const biketagPayload = getPayloadOpts(event, {
//     imgur: {
//       hash: game.mainhash,
//     },
//     game: biketagOpts.game,
//     size: '',
//     data: false,
//   })
// }

export const handler = async (event) => {
  console.log(event.body)
  const body = JSON.parse(event.body)
  console.log({ body })
  const payload = body.payload
  if (payload) {
    console.log({ payload })
    const superAdmin = 'keneucker@gmail.com'
    const formName = payload.form_name
    const playerIP = payload.data?.playerId
    const ambassadorId = payload.data?.ambassadorId ?? superAdmin
    const host = payload.data?.host
    const tag = JSON.parse(payload.data?.tag ?? '{}')
    const sentEmails: any = []
    let emailSent

    switch (formName) {
      case 'queue-found-tag':
        // send app notification
        break
      case 'queue-mystery-tag':
        // send app notification
        break
      case 'submit-queued-tag':
        // send app notification
        emailSent = await sendEmailNotification(superAdmin, formName, {
          tag,
          host,
          ambassadorsUrl: `${host}/#/queue?btaId=${ambassadorId}`,
          expiryHash: getEncodedExpiry({
            ambassadorId,
            game: tag.game,
            region: tag.game,
            tagnumber: tag.tagnumber,
          }),
        })
        sentEmails.push(emailSent)
        break
      default:
      case 'queue-tag-error':
        emailSent = await sendEmailNotification(superAdmin, 'queue-tag-error', {
          payload,
          playerIP,
        })
        sentEmails.push(emailSent)
        break
    }

    if (sentEmails.accepted.length) {
      console.log({ sentEmails })
      // success!
    } else if (emailSent) {
      console.log('error sending email', emailSent)
    }

    return {
      data: true,
      statusCode: 200,
    }
  }
}
