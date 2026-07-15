import { BikeTagEnv } from './constants'
import type { DomainInfo } from './types'

export const getDomainInfo = (req: any): DomainInfo => {
  const nonSubdomainHosts = [
    `${BikeTagEnv.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
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
    .replace(/www./g, '')
  let port = null
  let subdomain = null

  if (host.indexOf(':') > 0) {
    ;[host, port] = host.split(':')
  }

  const isSubdomain = nonSubdomainHosts.indexOf(host) === -1

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
