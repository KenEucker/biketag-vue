import type { Ambassador, Game, Tag } from 'biketag'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { Liquid } from 'liquidjs'
import nodemailer from 'nodemailer'
import { join } from 'path'
import sharp from 'sharp'
import { ErrorMessage } from './constants'

export const isGameEmailEnabled = (game: Game, name: string, aliases: string[] = []): boolean => {
  const settings = game.settings ?? {}
  if (String(settings['emails::sendall']).trim().toLowerCase() === 'false') return false
  const disabled = String(settings['emails::disable'] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
  return ![name, ...aliases, '*', 'all'].some((value) => disabled.includes(value.toLowerCase()))
}

const isStorageHost = (hostname: string): boolean =>
  /\.digitaloceanspaces\.com$/i.test(hostname) ||
  /\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(hostname)

/** Only providers with known thumbnail conventions may have their filenames rewritten. */
export const getEmailImageUrl = (url = '', size = ''): string => {
  if (!url || url.startsWith('cid:')) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if ([...parsed.searchParams.keys()].some((key) => /signature|^x-amz-/i.test(key))) return url
  const original = ['', 'original', 'o', 'l', 'large'].includes(size)
  if (parsed.hostname === 'i.imgur.com') {
    const sizes: Record<string, string> = { small: 's', medium: 'm', large: 'l' }
    const suffix = ['', 'original', 'o'].includes(size) ? '' : (sizes[size] ?? size)
    if (!['', 's', 'm', 'l'].includes(suffix)) return url
    parsed.pathname = parsed.pathname.replace(
      /(\/[a-z0-9]{5}|\/[a-z0-9]{7})(?:[sbtmlh])?(\.(?:jpe?g|png|gif|webp))$/i,
      `$1${suffix}$2`,
    )
  } else if (isStorageHost(parsed.hostname)) {
    // Queue variants may still be resizing. Originals are also the snapshot source.
    if (parsed.pathname.startsWith('/queue/')) return url
    if (original) return url
    const suffix = ['s', 'small'].includes(size) ? 'small' : 'medium'
    parsed.pathname = parsed.pathname.replace(/(?:_small|_medium)?(\.webp)$/i, `_${suffix}$1`)
  } else {
    return url
  }
  return parsed.href
}

export const getSubmissionQueuePosition = (queue: Tag[], tag: Tag): number | undefined => {
  const index = queue.findIndex((candidate) => {
    if (candidate.tagnumber !== tag.tagnumber) return false
    if (tag.playerId && candidate.playerId) return candidate.playerId === tag.playerId
    return !!tag.mysteryImageUrl && candidate.mysteryImageUrl === tag.mysteryImageUrl
  })
  return index === -1 ? undefined : index + 1
}

export const liquidOpts = { dynamicPartials: true, strictFilters: true, extname: '.liquid' }
const createRenderer = (html: boolean) => {
  const renderer = new Liquid({
    ...liquidOpts,
    ...(html ? { outputEscape: 'escape' as const } : {}),
  })
  renderer.registerFilter('biketag_image', getEmailImageUrl)
  return renderer
}
const htmlRenderer = createRenderer(true)
const textRenderer = createRenderer(false)

type InlineImage = {
  filename: string
  content: Buffer
  contentType: string
  cid: string
  contentDisposition: 'inline'
}
export type EmailImageCache = Map<string, Promise<InlineImage | null>>
const decodeAttribute = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/** Snapshots live in the message itself, so queue cleanup cannot remove its photographs. */
const loadQueueImage = async (url: string): Promise<InlineImage | null> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' })
    if (!response.ok) throw new Error(`Image returned HTTP ${response.status}`)
    const maxBytes = 12 * 1024 * 1024
    if (Number(response.headers.get('content-length')) > maxBytes)
      throw new Error('Image too large')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Image body missing')
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > maxBytes) throw new Error('Image too large')
        chunks.push(value)
      }
    } finally {
      await reader.cancel()
    }
    const content = await sharp(Buffer.concat(chunks))
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
    const cid = `${createHash('sha256').update(url).digest('hex').slice(0, 24)}@biketag`
    return {
      filename: `${cid.split('@')[0]}.jpg`,
      content,
      contentType: 'image/jpeg',
      cid,
      contentDisposition: 'inline',
    }
  } catch (error) {
    console.warn('[email] Could not snapshot queue image', {
      imagePath: new URL(url).pathname,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export const embedEmailQueueImages = async (html: string, cache: EmailImageCache = new Map()) => {
  const images = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"[^>]*>/gi)].filter((match) => {
    try {
      const url = new URL(decodeAttribute(match[1]))
      return (
        url.protocol === 'https:' &&
        isStorageHost(url.hostname) &&
        url.pathname.startsWith('/queue/')
      )
    } catch {
      return false
    }
  })
  const attachments = new Map<string, InlineImage>()
  const replacements = await Promise.all(
    images.map(async (match) => {
      const url = decodeAttribute(match[1])
      if (!cache.has(url)) cache.set(url, loadQueueImage(url))
      const attachment = await cache.get(url)!
      if (!attachment) {
        return [
          match[0],
          '<span style="font-family:Arial,sans-serif;font-size:14px">Photo unavailable. Open the dashboard to view this submission.</span>',
        ]
      }
      attachments.set(attachment.cid, attachment)
      return [match[0], match[0].replace(`src="${match[1]}"`, `src="cid:${attachment.cid}"`)]
    }),
  )
  for (const [before, after] of replacements) html = html.split(before).join(after)
  return { html, attachments: [...attachments.values()].sort((a, b) => a.cid.localeCompare(b.cid)) }
}

export const renderEmail = (template: string, locals: any) => {
  if (!/^[a-z0-9-]+$/.test(template)) throw new Error('Invalid email template')
  const basePath = join('functions', 'emails', template)
  const html = htmlRenderer.parseAndRenderSync(readFileSync(`${basePath}.liquid`, 'utf8'), locals)
  const text = textRenderer.parseAndRenderSync(
    readFileSync(`${basePath}--text.liquid`, 'utf8'),
    locals,
  )
  if (!html.trim() || !text.trim()) throw new Error(`Empty email template: ${template}`)
  return { html, text }
}

export const sendEmail = async (
  to: string,
  subject: string,
  locals: any,
  template = subject,
  replyTo?: string,
  imageCache: EmailImageCache = new Map(),
) => {
  if (!(process.env.G_EMAIL && process.env.G_PASS)) return null
  const { html, text } = renderEmail(template, locals)
  const message = await embedEmailQueueImages(html, imageCache)
  const transporter = nodemailer.createTransport({
    auth: { user: process.env.G_EMAIL, pass: process.env.G_PASS },
    service: 'gmail',
  })
  return transporter.sendMail({
    from: process.env.G_EMAIL,
    to,
    subject,
    text,
    ...message,
    ...(replyTo?.length ? { replyTo } : {}),
  })
}

export const sendEmailsToAmbassadors = async (
  emailName: string,
  emailSubject: string,
  ambassadors: Ambassador[],
  getEmailData: (a?: Ambassador) => any,
  sendToAdmin = false,
): Promise<{ accepted: any[]; rejected: any[] }> => {
  if (!(process.env.G_EMAIL && process.env.G_PASS))
    return { accepted: [], rejected: [ErrorMessage.EmailNotConfigured] }
  const recipients = ambassadors.filter((ambassador) => ambassador.email?.trim())
  if (sendToAdmin && process.env.ADMIN_EMAIL?.trim()) {
    recipients.push({
      id: process.env.ADMIN_EMAIL,
      email: process.env.ADMIN_EMAIL,
    } as unknown as Ambassador)
  }
  const sentTo = new Set<string>()
  const imageCache: EmailImageCache = new Map()
  const accepted: any[] = []
  const rejected: any[] = []
  for (const ambassador of recipients) {
    const email = ambassador.email!.trim()
    if (sentTo.has(email.toLowerCase())) continue
    sentTo.add(email.toLowerCase())
    try {
      const result = await sendEmail(
        email,
        emailSubject,
        getEmailData(ambassador),
        emailName,
        undefined,
        imageCache,
      )
      accepted.push(...(result?.accepted ?? []))
      rejected.push(...(result?.rejected ?? []))
      if (!result?.accepted?.length && !result?.rejected?.length) rejected.push(email)
    } catch (error) {
      rejected.push(email)
      console.error('[email] Delivery failed', { template: emailName, to: email, error })
    }
  }
  if (!sentTo.size) rejected.push('No email recipients configured')
  return { accepted, rejected }
}
