import request from 'request'

export type DomainInfo = {
  host: string
  subdomain: string | undefined
  isSubdomain: boolean
}

export const getDomainInfo = (req: request.Request | undefined, win?: Window): DomainInfo => {
  const nonSubdomainHosts = [
    `${process.env.HOST ?? 'biketag.local'}`,
    'biketag.dev',
    '0.0.0.0',
    'localhost',
  ]
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

export const getPayloadOpts = (query: string, body = {}, game?: string): any => {
  const params: any = new URLSearchParams(query) ?? []
  const biketagPayload = Object.fromEntries(params)

  biketagPayload.game = biketagPayload.game ?? biketagPayload.slug ?? game

  return {
    ...biketagPayload,
    ...body,
  }
}

export const getBikeTagClientOpts = (req: request.Request | undefined) => {
  const domainInfo = getDomainInfo(req)
  return {
    game: domainInfo.subdomain ?? process.env.GAME_NAME,
    imgur: {
      clientId: process.env.IMGUR_CLIENT_ID,
      hash: process.env.IMGUR_HASH,
    },
    sanity: {
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
    },
  }
}
