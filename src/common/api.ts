export const apiEndpoints = [
  { path: '/api/game', description: 'Game information and configuration.' },
  { path: '/api/tags', description: 'Published BikeTags for a game.' },
  { path: '/api/players', description: 'Players and their game activity.' },
  { path: '/api/stats', description: 'Game statistics.' },
  { path: '/api/recent', description: 'Recently published tags.' },
  { path: '/api/achievements', description: 'Game achievements.' },
  { path: '/api/ambassadors', description: 'Game ambassadors.' },
  { path: '/api/queue', description: 'Tags waiting in the game queue.' },
  {
    path: '/api/current?data=true',
    description: 'Current tag metadata (omit data for the image).',
  },
]

/** Keep requests on this site's API, including when a full URL is pasted. */
export function resolveApiUrl(input: string, origin: string): URL {
  const url = new URL(input.trim(), origin)
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.hash ||
    !/^\/api(?:\/[a-z0-9-]+)?\/?$/.test(url.pathname)
  ) {
    throw new Error('Enter an API path on this site, such as /api/current?data=true.')
  }
  return url
}

export function getRawApiPath(url: URL): string {
  const endpoint = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '') || 'api'
  return `/.netlify/functions/${endpoint}${url.search}`
}

export async function fetchApiResponse(url: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  const contentType = response.headers.get('content-type') || ''
  if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
    await response.body?.cancel()
    return {
      status: response.status,
      ok: response.ok,
      isJson: false,
      data: null,
      text: '',
      contentType,
    }
  }
  const text = await response.text()
  try {
    return {
      status: response.status,
      ok: response.ok,
      isJson: true,
      data: JSON.parse(text) as unknown,
      text: '',
      contentType,
    }
  } catch {
    return {
      status: response.status,
      ok: response.ok,
      isJson: false,
      data: null,
      text: text.slice(0, 10000),
      contentType,
    }
  }
}
