import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getGameSiteUrl,
  getProfileAuthorization,
  requireGlobalAdmin,
} from './common'
import { renderEmail, sendEmail } from './common/email'
import { emailTestTemplates, getEmailTestData } from './common/email-testing'

export default async (req: Request) => {
  const headers = {
    ...acceptCorsHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (!['GET', 'POST'].includes(req.method)) return respond({ error: 'Method not allowed' }, 405)

  try {
    const profile = await getProfileAuthorization(req)
    if (!requireGlobalAdmin(profile)) return respond({ error: 'Admin access required' }, 403)

    const configured = !!(process.env.G_EMAIL && process.env.G_PASS)
    if (req.method === 'GET') {
      return respond({ templates: emailTestTemplates, configured, recipient: profile.email })
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return respond({ error: 'Invalid JSON request' }, 400)
    }
    const template = emailTestTemplates.find((entry) => entry.name === payload?.template)
    if (!template) return respond({ error: 'Select a valid email template' }, 400)
    if (!['preview', 'send'].includes(payload.action)) {
      return respond({ error: 'Select preview or send' }, 400)
    }

    const game = getBikeTagClientOpts(req).game
    if (typeof game !== 'string' || !game.length) {
      return respond({ error: 'Open email testing from a game site' }, 400)
    }
    const locals = getEmailTestData(game, getGameSiteUrl(game))
    const subject = `[TEST] [${game}] ${template.label}`
    if (payload.action === 'preview') {
      return respond({ subject, ...renderEmail(template.name, locals) })
    }

    const recipient = typeof payload.recipient === 'string' ? payload.recipient.trim() : ''
    if (recipient.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient)) {
      return respond({ error: 'Enter a single valid recipient email address' }, 400)
    }
    if (!configured)
      return respond({ error: 'Email delivery is not configured on this server' }, 503)

    const result = await sendEmail(recipient, subject, locals, template.name)
    if (!result?.accepted?.length || result.rejected?.length) {
      return respond({ error: 'The mail server did not accept the test email' }, 502)
    }
    return respond({ success: true, recipient, subject })
  } catch (error) {
    console.error('[email-test] Request failed', error)
    return respond({ error: 'Unable to process the email test. Check the server logs.' }, 500)
  }
}
