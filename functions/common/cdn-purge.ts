import axios from 'axios'
import { log } from './methods'

const CDN_ENDPOINTS_URL = 'https://api.digitalocean.com/v2/cdn/endpoints'
const endpointIdByOrigin = new Map<string, string>()

const getDoApiToken = (): string | undefined =>
  process.env.S3_BE_ACCESS_KEY

export const getCdnPathsFromStorageKey = (key: string): string[] => {
  if (!key?.length) return []

  const filename = key.split('/').pop() ?? ''
  const filenameBase = filename.replace(/\.(webp|jpg|jpeg|png|gif|bmp)$/i, '')
  if (!filenameBase.length) return [key]

  const paths = new Set<string>([key])
  if (key.startsWith('queue/')) {
    paths.add(`queue/${filenameBase}_small.webp`)
    paths.add(`queue/${filenameBase}_medium.webp`)
  }

  return [...paths]
}

export const getCdnPathsFromStorageUrl = (url: string): string[] => {
  try {
    return getCdnPathsFromStorageKey(new URL(url).pathname.replace(/^\//, ''))
  } catch {
    return []
  }
}

const resolveCdnEndpointId = async (bucket: string, region: string): Promise<string | undefined> => {
  const origin = `${bucket}.${region}.digitaloceanspaces.com`
  const cached = endpointIdByOrigin.get(origin)
  if (cached) return cached

  const token = getDoApiToken()
  if (!token?.length) return undefined

  try {
    const response = await axios.get(CDN_ENDPOINTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    })

    if (response.status < 200 || response.status >= 300) {
      log('[cdn] Failed to list CDN endpoints', { status: response.status, origin }, 'warn')
      return undefined
    }

    const endpoints = response.data?.endpoints ?? []
    const match = endpoints.find(
      (endpoint: { origin?: string; endpoint?: string; id?: string }) =>
        endpoint.origin === origin ||
        endpoint.endpoint?.includes(`${bucket}.${region}.cdn.digitaloceanspaces.com`),
    )

    if (match?.id) {
      endpointIdByOrigin.set(origin, match.id)
      return match.id
    }

    log('[cdn] No CDN endpoint matched Spaces origin', { origin }, 'warn')
    return undefined
  } catch (error: any) {
    log('[cdn] CDN endpoint lookup error', { origin, message: error?.message ?? error }, 'warn')
    return undefined
  }
}

export const purgeSpacesCdnPaths = async (
  bucket: string,
  region: string,
  paths: string[],
): Promise<void> => {
  const uniquePaths = [...new Set(paths.filter((path) => path?.length))]
  if (!uniquePaths.length) return

  const token = getDoApiToken()
  if (!token?.length) {
    log('[cdn] Skipping purge — S3_BE_ACCESS_KEY not configured', { pathCount: uniquePaths.length }, 'warn')
    return
  }

  const cdnId = await resolveCdnEndpointId(bucket, region)
  if (!cdnId?.length) return

  for (let index = 0; index < uniquePaths.length; index += 50) {
    const batch = uniquePaths.slice(index, index + 50)
    try {
      const response = await axios.delete(`${CDN_ENDPOINTS_URL}/${cdnId}/cache`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { files: batch },
        validateStatus: () => true,
      })

      if (response.status < 200 || response.status >= 300) {
        log('[cdn] Purge request failed', { status: response.status, cdnId, batch }, 'warn')
      } else {
        log('[cdn] Purged CDN cache paths', { cdnId, count: batch.length }, 'info')
      }
    } catch (error: any) {
      log('[cdn] Purge request error', { cdnId, message: error?.message ?? error }, 'warn')
    }
  }
}

export const purgeSpacesCdnUrls = async (
  bucket: string,
  region: string,
  urls: string[],
): Promise<void> => {
  const paths = urls.flatMap(getCdnPathsFromStorageUrl)
  await purgeSpacesCdnPaths(bucket, region, paths)
}
