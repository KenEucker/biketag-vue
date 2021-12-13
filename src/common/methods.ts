import request from 'request'

export type DomainInfo = {
  host: string
  subdomain: string | undefined
  isSubdomain: boolean
}

export const getDomainInfo = (req: request.Request | undefined, win: Window): DomainInfo => {
  const nonSubdomainHosts = [`${process.env.HOST ?? 'biketag.local'}`, '0.0.0.0', 'localhost']
  let host = (req ? req.headers.host : win ? win.location.host : '')
    .toLowerCase()
    .replace(/www./g, '')
  let port = null
  let subdomain

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
