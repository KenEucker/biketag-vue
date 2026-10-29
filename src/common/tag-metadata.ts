/** DigitalOcean `data` metadata keys used by the BikeTag AWS adapter. */
export const tagMetadataFields = {
  mystery: {
    t: 'tagnumber',
    p: 'playerId',
    mp: 'mysteryPlayer',
    mt: 'mysteryTime',
    h: 'hint',
    d: 'discussionUrl',
    s: 'shareUrl',
    m: 'mentionUrl',
  },
  found: {
    t: 'tagnumber',
    p: 'playerId',
    fp: 'foundPlayer',
    ft: 'foundTime',
    fl: 'foundLocation',
    g: 'gps',
    c: 'confirmedBoundary',
  },
} as const

export type TagMetadataType = keyof typeof tagMetadataFields
