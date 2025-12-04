// netlify/edge-functions/fedify-router.mts
import type { Context } from 'https://edge.netlify.com'

// Content types that indicate an ActivityPub client.
const ACTIVITY_ACCEPT_TYPES = [
  'application/activity+json',
  'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
]

// --- utils ---------------------------------------------------------------

const wantsActivityJson = (req: Request): boolean => {
  const accept = req.headers.get('accept') || ''
  const lowered = accept.toLowerCase()
  return ACTIVITY_ACCEPT_TYPES.some((t) => lowered.includes(t.toLowerCase()))
}

/**
 * Normalize a player identifier into a slug:
 * - NFKC normalize
 * - lower-case
 * - collapse any run of non a-z0-9 into a single hyphen
 * - trim leading/trailing hyphens
 *
 * This gives you case-insensitive, URL-safe IDs while still
 * letting display names keep spaces/punctuation in your app.
 */
const normalizeIdentifier = (raw: string): string => {
  const normalized = raw.normalize('NFKC').toLowerCase()
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'player' // avoid empty IDs
}

// In the future you can wire this to Auth0/Sanity.
// For now it's a stub that always "finds" the player.
const findPlayerBySlug = async (slug: string) => {
  // TODO: Look up player by slug in Sanity/Auth0/Blobs.
  // Return null if not found.
  return {
    slug,
    displayName: slug, // Replace with stored display/displayName
  }
}

// --- Edge function entry -------------------------------------------------

export default async (request: Request, context: Context): Promise<Response> => {
  const url = new URL(request.url)
  const { pathname, host } = url

  const isWellKnown = pathname.startsWith('/.well-known/')
  const isActor = pathname.startsWith('/players/')

  // SHORT CIRCUIT:
  // If it's not one of our fediverse endpoints AND the client isn't
  // explicitly asking for ActivityPub content, pass it through.
  if (!isWellKnown && !isActor && !wantsActivityJson(request)) {
    return context.next()
  }

  // Handle WebFinger for player / city actors.
  if (pathname === '/.well-known/webfinger') {
    return handleWebFinger(request, url)
  }

  // Handle ActivityPub actor document.
  if (isActor && wantsActivityJson(request)) {
    return handleActor(request, url)
  }

  // Anything else that got this far is fediverse-adjacent but unsupported.
  return new Response('Not found', { status: 404 })
}

// --- WebFinger -----------------------------------------------------------
// Example: GET /.well-known/webfinger?resource=acct:ken@biketag.org

const handleWebFinger = (request: Request, url: URL): Response => {
  const resource = url.searchParams.get('resource')
  if (!resource) {
    return new Response('Missing resource parameter', { status: 400 })
  }

  // Accept:
  //  - acct:ken@biketag.org
  //  - acct:Ken-Rider@biketag.org
  //  - @ken@biketag.org (some clients do this)
  const match = resource.match(/^(?:acct:)?@?([^@]+)@(.+)$/i)
  if (!match) {
    return new Response('Unsupported resource format', { status: 400 })
  }

  const [, rawLocalPart, resourceHost] = match

  if (resourceHost.toLowerCase() !== url.host.toLowerCase()) {
    // WebFinger request is for some other host; we don't serve that.
    return new Response('Resource host mismatch', { status: 404 })
  }

  const slug = normalizeIdentifier(rawLocalPart)
  const origin = `${url.protocol}//${url.host}`
  const actorUrl = `${origin}/players/${encodeURIComponent(slug)}`

  // We use the slug in the subject to establish the canonical handle.
  const subject = `acct:${slug}@${host}`

  const body = {
    subject,
    aliases: [actorUrl],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: actorUrl,
      },
    ],
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/jrd+json; charset=utf-8',
    },
  })
}

// --- Actor document ------------------------------------------------------
// Example: GET /players/ken with Accept: application/activity+json

const handleActor = async (_request: Request, url: URL): Promise<Response> => {
  const segments = url.pathname.split('/')
  const rawId = segments[segments.length - 1] || ''
  const slug = normalizeIdentifier(decodeURIComponent(rawId))

  const player = await findPlayerBySlug(slug)
  if (!player) {
    return new Response('Actor not found', { status: 404 })
  }

  const origin = `${url.protocol}//${url.host}`
  const actorId = `${origin}/players/${encodeURIComponent(slug)}`

  // In the future, you'll also add publicKey, endpoints.sharedInbox, icon, etc.
  const person = {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: actorId,
    type: 'Person',
    preferredUsername: slug, // canonical handle part (case-insensitive)
    name: player.displayName || slug, // nice name for humans
    inbox: `${actorId}/inbox`,
    outbox: `${actorId}/outbox`,
    url: `${origin}/player/${encodeURIComponent(slug)}`, // your web profile route (adjust as needed)
  }

  return new Response(JSON.stringify(person), {
    status: 200,
    headers: {
      'content-type': 'application/activity+json; profile="https://www.w3.org/ns/activitystreams"',
    },
  })
}
