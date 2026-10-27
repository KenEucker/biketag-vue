import { BikeTagEnv } from './constants'
import type { DomainInfo } from './types'

export const getDomainInfo = (req: any): DomainInfo => {
  const nonSubdomainHosts = [
    `${BikeTagEnv.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
    '127.0.0.1',
    'localhost',
  ]
  let host = (
    req.headers?.get('host')?.length
      ? req.headers.get('host')
      : req?.location?.host?.length
        ? req.location.host
        : ''
  )
    .toLowerCase()
    .replace(/^www\./, '')
  let port = null
  let subdomain = null

  if (host.indexOf(':') > 0) {
    ;[host, port] = host.split(':')
  }

  // Netlify deploy IDs and branch names identify deployments, not BikeTag games.
  const isSubdomain = !nonSubdomainHosts.includes(host) && !host.endsWith('.netlify.app')

  if (isSubdomain) {
    const hostSplit = host.split('.')
    subdomain = hostSplit[0]
    host = hostSplit.join('.')
  }

  return {
    host: host + (port ? ':' + port : ''),
    isSubdomain,
    subdomain,
  }
}
