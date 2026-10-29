export const BikeTagDefaults = {
  appId: 'com.app.biketag',
  adminEmail: 'hello@biketag.org',
  gameName: '',
  host: 'biketag.org',
  hostKey: 'ItsABikeTagGame',
  logo: '/images/BikeTag.svg',
  jingle: 'media/biketag-jingle-1.mp3',
  imageSource: 'aws',
  gameSource: 'sanity',
  store: 'biketag',
  cacheResetInterval: '5000',
  manifest: {
    name: 'BikeTag',
    shortName: 'BikeTag',
    description: 'BikeTag is a photo mystery tag game played on bicycles. No login required.',
    themeColor: '#000000',
  },
  /// TODO: THIS IS BAD
  sanityImagesCDNUrl: 'https://cdn.sanity.io/images/',
  sanityBaseCDNUrl: 'https://cdn.sanity.io/images/x37ikhvs/production/',
  sanityPlayerRoleID: 'rol_pcbQ68Q9L0yn1o3O',
  sanityAmbassadorRoleID: 'rol_iET51vzIn8z6Utz0',
}

// Browser-visible configuration only. Keep credentials in functions/ and keep
// the build allowlist in config/frontend-environment.ts in sync with this object.
export const BikeTagEnv = {
  APP_ID: process.env.APP_ID ?? BikeTagDefaults.appId ?? null,
  DEBUG_FE: process.env.DEBUG_FE ?? process.env.DEBUG_A ?? 'false',
  CACHE_RESET_INTERVAL: process.env.CACHE_RESET_INTERVAL ?? BikeTagDefaults.cacheResetInterval,
  CONTEXT: process.env.CONTEXT ?? null,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? BikeTagDefaults.adminEmail,
  AMBASSADOR_ROLE: process.env.AMBASSADOR_ROLE ?? BikeTagDefaults.sanityAmbassadorRoleID,
  PLAYER_ROLE: process.env.PLAYER_ROLE ?? BikeTagDefaults.sanityPlayerRoleID,
  /* Auth0 Configuration */
  // Auth0's SPA client ID is public; management credentials are server-only.
  A_CID: process.env.A_CID ?? null,
  A_DOMAIN: process.env.A_DOMAIN ?? null,
  /* Bugs Configuration */
  B_KEY: process.env.B_KEY ?? process.env.CLIENT_KEY ?? null,
  /* BikeTag Configuration */
  GAME_NAME: process.env.GAME_NAME ?? null,
  GAME_SOURCE: process.env.GAME_SOURCE ?? BikeTagDefaults.gameSource,
  IMAGE_SOURCE: process.env.IMAGE_SOURCE ?? BikeTagDefaults.imageSource,
  HOST: process.env.HOST ?? BikeTagDefaults.host ?? null,
  /* Google Configuration */
  // Use a browser-restricted Maps API key, never an OAuth access token.
  G_AKEY: process.env.G_AKEY ?? process.env.GOOGLE_API_KEY ?? null,
  /* Imgur Configuration */
  I_CID: process.env.I_CID ?? process.env.IMGUR_CLIENT_ID ?? null,
  RA_FE_KEY: process.env.RA_FE_KEY ?? null,
  /* Sanity Configuration */
  S_CURL: process.env.S_CURL ?? BikeTagDefaults.sanityImagesCDNUrl ?? '',
  S_DSET: process.env.S_DSET ?? process.env.SANITY_DATASET ?? '',
  S_PID: process.env.S_PID ?? process.env.SANITY_PROJECT_ID ?? '',
  RELOAD_SW: process.env.RELOAD_SW ?? 'false',
  // Intentionally public, restricted frontend credentials.
  S3_FE_AID: process.env.S3_FE_AID ?? process.env.S3_FE_ACCESS_ID ?? null,
  S3_FE_AKEY: process.env.S3_FE_AKEY ?? process.env.S3_FE_ACCESS_KEY ?? null,
  IMGUR_DELAY_NOTICE: process.env.IMGUR_DELAY_NOTICE ?? null,
  IMGUR_DELAY: process.env.IMGUR_DELAY ?? null,
}

export const special = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
]
export const deca = ['twent', 'thirt', 'fort', 'fift', 'sixt', 'sevent', 'eight', 'ninet']
