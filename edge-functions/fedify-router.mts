// netlify/edge-functions/fedify-router.mts

import type { Context } from 'netlify:edge'
import { getStore } from '@netlify/blobs'

/**
 * ActivityPub-ish content types that tell us the client is a fediverse client.
 */
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
 *
 * IMPORTANT: This same logic should be used anywhere you:
 *   - create a new player login
 *   - attach a login to an existing player
 * so that "Bike Punk", "bike-punk", "BIKE PUNK!!!" all map to the same slug.
 */
const normalizeIdentifier = (raw: string): string => {
  const normalized = raw.normalize('NFKC').toLowerCase()
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'player' // avoid empty IDs
}

/**
 * Shape of the player data we expect to read from Netlify Blobs.
 *
 * This is intentionally minimal for now. You can expand it later as
 * needed (avatar, bio, gamesPlayed, etc) without changing the fediverse
 * surface all that much.
 */
type PlayerProfile = {
  /** Stable internal ID (your GUID-based playerID) */
  id: string
  /** Canonical slug (lowercase, normalized) */
  slug: string
  /** Human-facing display name, can have spaces/emoji/etc */
  displayName: string
  /** Optional URL for a web profile page */
  url?: string
  /** Optional avatar image URL */
  avatarUrl?: string
}

// Use a single site-wide store for fediverse-related player data.
const playersStore = getStore('players')

/**
 * Look up a player by slug in Netlify Blobs.
 *
 * Expected write side (outside this edge function):
 *   - When a player successfully attaches a login to a player name
 *   - Or when a new player profile is created
 * you write something like:
 *
 *   await playersStore.setJSON(`player:${slug}`, {
 *     id: playerId,           // GUID you generate and keep stable
 *     slug,
 *     displayName,            // original player name string
 *     url,                    // e.g. https://biketag.org/player/<slug>
 *     avatarUrl,              // optional
 *   })
 *
 * That write logic should live in a regular Netlify Function that already
 * has access to Auth0 + Sanity, not here at the edge.
 */
const findPlayerBySlug = async (slug: string): Promise<PlayerProfile | null> => {
  try {
    const data = await playersStore.get(`player:${slug}`, { type: 'json' })

    if (!data) {
      return null
    }

    // Basic runtime guard so bad data doesn’t 500 your edge function.
    if (
      typeof (data as any).id !== 'string' ||
      typeof (data as any).slug !== 'string' ||
      typeof (data as any).displayName !== 'string'
    ) {
      // You can context.log() here if you want once you thread Context in.
      return null
    }

    return data as PlayerProfile
  } catch (err) {
    // Fail closed: if blobs are unavailable or corrupted, we just
    // say "actor not found" instead of leaking internal errors.
    return null
  }
}

// --- Edge function entry -------------------------------------------------

export default async (request: Request, context: Context): Promise<Response> => {
  const url = new URL(request.url)
  const { pathname } = url

  const isWellKnown = pathname.startsWith('/.well-known/')
  const isActor = pathname.startsWith('/players/')

  /**
   * SHORT CIRCUIT:
   *
   * If it's not one of our fediverse endpoints AND the client isn't
   * explicitly asking for ActivityPub content, pass it through to:
   *   - your SPA (/* → /)
   *   - your /api/* Netlify functions
   *   - anything else you already have configured
   *
   * This is what keeps this edge function from hijacking your existing app.
   */
  if (!isWellKnown && !isActor && !wantsActivityJson(request)) {
    return context.next()
  }

  // Handle WebFinger for player actors.
  if (pathname === '/.well-known/webfinger') {
    return handleWebFinger(request, url)
  }

  // Handle ActivityPub actor document.
  if (isActor && wantsActivityJson(request)) {
    return handleActor(request, url)
  }

  // Anything else that got this far is fediverse-ish but unsupported for now.
  return new Response('Not found', { status: 404 })
}

// --- WebFinger -----------------------------------------------------------
// Example: GET /.well-known/webfinger?resource=acct:ken@biketag.org

const handleWebFinger = (_request: Request, url: URL): Response => {
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
  const subject = `acct:${slug}@${url.host}`

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

  // If you later add signing keys, inbox handling, etc., this is the object
  // Fedify (or your own ActivityPub/ATProto glue) will extend.
  const person: Record<string, unknown> = {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: actorId,
    type: 'Person',

    // canonical, case-insensitive handle part:
    preferredUsername: slug,

    // human-facing, keeps their original capitalization/punctuation:
    name: player.displayName || slug,

    // Actor endpoints – these URLs don’t have to exist yet, but this
    // is where you’d point any future inbox/outbox implementation.
    inbox: `${actorId}/inbox`,
    outbox: `${actorId}/outbox`,

    // Where you’ll eventually show a global player profile.
    // You can implement this in your SPA when you’re ready.
    url: player.url || `${origin}/player/${encodeURIComponent(slug)}`,
  }

  if (player.avatarUrl) {
    person.icon = {
      type: 'Image',
      url: player.avatarUrl,
    }
  }

  return new Response(JSON.stringify(person), {
    status: 200,
    headers: {
      'content-type': 'application/activity+json; profile="https://www.w3.org/ns/activitystreams"',
    },
  })
}
