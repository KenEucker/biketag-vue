import { builder, Handler } from '@netlify/functions'
import nodemailer from 'nodemailer'
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
  from?: string
) => {
  const emailOpts = {
    from: from ?? process.env.GOOGLE_EMAIL_ADDRESS, // sender address
    to, // list of receivers
    subject, // Subject line
    text, // plain text body
    html, // html body
  }

  const transporterOpts: any = {
    auth: {
      // type: 'OAuth2',
      user: process.env.GOOGLE_EMAIL_ADDRESS,
      pass: process.env.GOOGLE_PASSWORD,
      // clientId: process.env.GOOGLE_CLIENT_ID,
      // clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      // accessToken: process.env.GOOGLE_ACCESS_TOKEN,
    },
    service: 'gmail',
  }

  console.log({ transporterOpts })
  const transporter = nodemailer.createTransport(transporterOpts)

  const info = await transporter.sendMail(emailOpts)

  /// TODO: formulate the response into something usable
  return info
}

const handler = async (event) => {
  /// Send new found image queued notification
  const emailSent = await sendEmail(
    'keneucker@gmail.com',
    'submission-created',
    JSON.stringify(event)
  )
  /// Send new queued tag submitted notification
  /// Send error report notification to admins
  const out = { event, emailSent }
  console.log({ out })
  return {
    data: JSON.stringify(out),
    statusCode: 200,
  }
}

// const handler = builder(myHandler)

export { handler }
