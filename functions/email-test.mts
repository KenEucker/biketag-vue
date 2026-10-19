import { BikeTagClient, type Game } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getGameSiteUrl,
  getImageSource,
  getProfileAuthorization,
  requireGlobalAdmin,
} from './common'
import { renderEmail, sendEmail } from './common/email'
import { emailTestTemplates, getEmailTestData } from './common/email-testing'
import type { EmailTestContext } from './common/email-testing'

const submissionTemplates = ['post-new-biketag', 'approve-new-biketag']

const loadLiveContext = async (
  req: Request,
  game: string,
  template: string,
): Promise<EmailTestContext> => {
  const useQueue = submissionTemplates.includes(template)
  if (!useQueue && template !== 'biketag-auto-posted') return {}

  try {
    const client = new BikeTagClient(getBikeTagClientOpts(req, true))
    const gameData = (await client.game(game, { source: 'sanity', concise: true })) as Game
    if (!gameData?.name) return {}
    client.config(getBikeTagClientOpts(req, true, false, gameData), false, true)
    const source = getImageSource(gameData)
    const [current, queue] = await Promise.allSettled([
      client.getTag(undefined, { source }),
      useQueue
        ? client.getQueue({ resize: false, reindex: false }, { source })
        : Promise.resolve(null),
    ])
    const currentTag =
      current.status === 'fulfilled' && current.value.success
        ? (current.value.data ?? undefined)
        : undefined
    const queuedTags =
      queue.status === 'fulfilled' && queue.value?.success && Array.isArray(queue.value.data)
        ? queue.value.data
        : []
    const queuedTag =
      queuedTags.find((tag) => tag.foundImageUrl?.length && tag.mysteryImageUrl?.length) ??
      queuedTags.find((tag) => tag.foundImageUrl?.length || tag.mysteryImageUrl?.length)
    return { currentTag, queuedTag }
  } catch (error) {
    console.warn('[email-test] Could not load live data; using sample content', error)
    return {}
  }
}

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
    const recipient = typeof payload.recipient === 'string' ? payload.recipient.trim() : ''
    if (payload.action === 'send') {
      if (recipient.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient)) {
        return respond({ error: 'Enter a single valid recipient email address' }, 400)
      }
      if (!configured)
        return respond({ error: 'Email delivery is not configured on this server' }, 503)
    }

    const context = await loadLiveContext(req, game, template.name)
    const locals = getEmailTestData(game, getGameSiteUrl(game), context)
    const dataSource = submissionTemplates.includes(template.name)
      ? context.queuedTag
        ? `Queued submission for round #${context.queuedTag.tagnumber}.`
        : 'Sample submission (queued photos unavailable).'
      : template.name === 'biketag-auto-posted'
        ? context.currentTag
          ? `Current round #${context.currentTag.tagnumber}.`
          : 'Sample round (current round unavailable).'
        : 'Sample content.'
    const subject = `[TEST] [${game}] ${template.label}`
    if (payload.action === 'preview') {
      return respond({ subject, dataSource, ...renderEmail(template.name, locals) })
    }

    const result = await sendEmail(recipient, subject, locals, template.name)
    if (!result?.accepted?.length || result.rejected?.length) {
      return respond({ error: 'The mail server did not accept the test email' }, 502)
    }
    return respond({ success: true, recipient, subject, dataSource })
  } catch (error) {
    console.error('[email-test] Request failed', error)
    return respond({ error: 'Unable to process the email test. Check the server logs.' }, 500)
  }
}
