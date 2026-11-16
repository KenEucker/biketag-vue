import { BikeTagClient } from 'biketag'
import { getBikeTagClientOpts } from './common'

const imageTypes: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

const getImageType = (src: string) => {
  const extension = new URL(src).pathname.split('.').pop()?.toLowerCase()
  return extension ? imageTypes[extension] : undefined
}

const getGameLogoUrl = (logo: string, size: number) => {
  if (/^https?:\/\//i.test(logo)) return logo

  const image = logo
    .replace('image-', '')
    .replace('-png', '.png')
    .replace('-webp', '.webp')
    .replace('-gif', '.gif')
    .replace('-jpg', '.jpg')

  return `https://cdn.sanity.io/images/x37ikhvs/production/${image}?h=${size}&w=${size}`
}

const getManifest = (
  origin: string,
  game?: { name?: string; logo?: string },
  slug?: string,
) => {
  const host = new URL(origin).host
  const name = game?.name?.length ? game.name.toUpperCase() + '.BIKETAG' : 'BikeTag'
  const logo = game?.logo
  const hasGameLogo = !!logo?.length
  const icon192 = logo ? getGameLogoUrl(logo, 192) : `https://${host}/android-chrome-192x192.png`
  const icon512 = logo ? getGameLogoUrl(logo, 512) : `https://${host}/android-chrome-512x512.png`

  return {
    id: slug ? `${slug}.biketag` : 'biketag',
    name,
    short_name: game?.name?.length ? game.name : 'BikeTag',
    description: game?.name
      ? `The game of BikeTag in ${game.name} - BikeTag is a photo mystery tag game played on bicycles. No login required.`
      : 'BikeTag is a photo mystery tag game played on bicycles. No login required.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#000000',
    background_color: '#000000',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        ...(getImageType(icon192) ? { type: getImageType(icon192) } : {}),
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        ...(getImageType(icon512) ? { type: getImageType(icon512) } : {}),
        purpose: 'any',
      },
      ...(hasGameLogo
        ? [
            {
              src: icon512,
              sizes: '512x512',
              ...(getImageType(icon512) ? { type: getImageType(icon512) } : {}),
              purpose: 'maskable',
            },
          ]
        : [
            {
              src: `https://${host}/maskable_icon_x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ]),
    ],
  }
}

export default async (req: Request) => {
  const origin = new URL(req.url).origin
  const headers = new Headers({
    'Content-Type': 'application/manifest+json; charset=utf-8',
    'Cache-Control': 'no-cache',
  })

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(null, { status: 405, headers })
  }

  try {
    const clientOptions = getBikeTagClientOpts(req)
    const client = new BikeTagClient(clientOptions)
    const { game } = clientOptions
    const response = await client.getGame({ game }, { source: 'sanity' })
    const gameData =
      response.success && !Array.isArray(response.data) ? response.data : undefined

    const body = JSON.stringify(getManifest(origin, gameData, game))
    return new Response(req.method === 'HEAD' ? null : body, { headers })
  } catch {
    const body = JSON.stringify(getManifest(origin))
    return new Response(req.method === 'HEAD' ? null : body, { headers })
  }
}
