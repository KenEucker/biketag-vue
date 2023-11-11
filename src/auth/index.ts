export const isAuthenticationEnabled = () => !!process.env.A_DOMAIN?.length

export * from './authGuard'
