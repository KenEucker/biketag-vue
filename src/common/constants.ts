export const BikeTagDefaults = {
  appId: 'com.app.biketag',
  accessToken: '8b4e2b86a724bf3f39d6766de6e67212',
  admingEmail: 'biketag@biketag.org',
  gameName: '',
  host: 'biketag.org',
  hostKey: 'ItsABikeTagGame',
  logo: '/images/BikeTag.svg',
  jingle: 'media/biketag-jingle-1.mp3',
  imageSource: 'imgur',
  gameSource: 'sanity',
  store: 'biketag',
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

export const BikeTagEnv = {
  APP_ID: process.env.APP_ID ?? BikeTagDefaults.appId,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN ?? BikeTagDefaults.accessToken,
  CONTEXT: process.env.CONTEXT ?? null,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? BikeTagDefaults.admingEmail,
  AMBASSADOR_ROLE: process.env.AMBASSADOR_ROLE ?? BikeTagDefaults.sanityAmbassadorRoleID,
  PLAYER_ROLE: process.env.PLAYER_ROLE ?? BikeTagDefaults.sanityPlayerRoleID,
  /* Auth0 Configuration */
  A_AUDIENCE: process.env.A_AUDIENCE ?? null,
  A_CID: process.env.A_CID ?? null,
  A_DOMAIN: process.env.A_DOMAIN ?? null,
  A_M_CS: process.env.A_M_CS ?? null,
  A_M_CID: process.env.A_M_CID ?? null,
  /* Bugs Configuration */
  B_AKEY: process.env.B_AKEY ?? null,
  /* BikeTag Configuration */
  GAME_NAME: process.env.GAME_NAME ?? 'null',
  GAME_SOURCE: process.env.GAME_SOURCE ?? null,
  HOST: process.env.HOST ?? BikeTagDefaults.host,
  HOST_KEY: process.env.HOST_KEY ?? BikeTagDefaults.hostKey,
  /* Google Configuration */
  G_AKEY: process.env.G_AKEY ?? process.env.GOOGLE_ACCESS_TOKEN ?? null,
  G_CID: process.env.G_CID ?? process.env.GOOGLE_CLIENT_ID ?? null,
  G_CSECRET: process.env.G_CSECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? null,
  G_EMAIL: process.env.G_EMAIL ?? process.env.GOOGLE_EMAIL_ADDRESS ?? null,
  G_PASS: process.env.G_PASS ?? process.env.GOOGLE_PASSWORD ?? null,
  G_RTOKEN: process.env.G_RTOKEN ?? process.env.GOOGLE_REFRESH_TOKEN ?? null,
  /* Imgur Admin Configuration */
  IA_CID: process.env.IA_CID ?? process.env.IMGUR_ADMIN_CLIENT_ID ?? null,
  IA_CSECRET: process.env.IA_CSECRET ?? process.env.IMGUR_ADMIN_CLIENT_SECRET ?? null,
  IA_RTOKEN: process.env.IA_RTOKEN ?? process.env.IMGUR_ADMIN_REFRESH_TOKEN ?? null,
  IA_TOKEN: process.env.IA_TOKEN ?? process.env.IMGUR_ADMIN_ACCESS_TOKEN ?? null,
  /* Imgur Configuration */
  I_CID: process.env.I_CID ?? process.env.IMGUR_CLIENT_ID ?? null,
  I_CSECRET: process.env.I_CSECRET ?? process.env.IMGUR_CLIENT_SECRET ?? null,
  I_RTOKEN: process.env.I_RTOKEN ?? process.env.IMGUR_REFRESH_TOKEN ?? null,
  I_TOKEN: process.env.I_TOKEN ?? process.env.IMGUR_ACCESS_TOKEN ?? null,
  /* Sanity Admin Configuration */
  SA_CDN_URL: process.env.SA_CDN_URL ?? BikeTagDefaults.sanityImagesCDNUrl,
  SA_DSET: process.env.SA_DSET ?? process.env.SANITY_ADMIN_DATASET ?? null,
  SA_PID: process.env.SA_PID ?? process.env.SANITY_ADMIN_PROJECT_ID ?? null,
  SA_TOKEN: process.env.SA_TOKEN ?? process.env.SANITY_ADMIN_ACCESS_TOKEN ?? null,
  /* Sanity Configuration */
  S_CURL: process.env.S_CURL ?? BikeTagDefaults.sanityImagesCDNUrl,
  S_DSET: process.env.S_DSET ?? process.env.SANITY_DATASET ?? null,
  S_PID: process.env.S_PID ?? process.env.SANITY_PROJECT_ID ?? null,
  S_TOKEN: process.env.S_TOKEN ?? process.env.SANITY_ACCESS_TOKEN ?? null,
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
