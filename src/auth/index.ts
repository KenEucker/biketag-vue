export * from './authGuard';
export const isAuthenticationEnabled = () => !!process.env.A_DOMAIN?.length
