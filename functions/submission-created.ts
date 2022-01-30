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

const handler = async (event) => {
  /// Send new found image queued notification
  /// Send new queued tag submitted notification
  /// Send error report notification to admins
  const emailSent = await sendEmail('keneucker@gmail.com', 'submission-created', event.body)
  console.log({ emailSent })

  return {
    data: event.body,
    statusCode: 200,
  }
}

export { handler }
