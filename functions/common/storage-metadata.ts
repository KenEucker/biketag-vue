import type { Tag } from 'biketag'

export const decodeQueueMetadataValue = (value: string): string => {
  try {
    if (!value || !/^[A-Za-z0-9+/=]+$/.test(value)) return value
    return Buffer.from(value, 'base64').toString('utf-8')
  } catch {
    return value
  }
}

export const parseQueueObjectMetadata = (data?: string) => {
  if (!data) return undefined
  try {
    const tag = JSON.parse(decodeQueueMetadataValue(data))
    const tagnumber = typeof tag.t === 'number' ? tag.t : undefined
    if (tagnumber === undefined) return undefined
    return {
      tagnumber,
      playerId: tag.p as string | undefined,
      mysteryPlayer: tag.mp as string | undefined,
      foundPlayer: tag.fp as string | undefined,
      foundTime: typeof tag.ft === 'number' ? tag.ft : undefined,
      foundLocation:
        typeof tag.fl === 'string' ? tag.fl : (tag.foundLocation as string | undefined),
      gps: (tag.g ?? tag.gps) as Tag['gps'],
    }
  } catch {
    return undefined
  }
}
