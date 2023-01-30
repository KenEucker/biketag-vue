import { useAuth0 } from '@auth0/auth0-vue'

export const authGuard = (to: { fullPath: any }, from: any, next: (arg0?: boolean) => any) => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()

  if (isLoading.value) return next(false)
  if (isAuthenticated.value) {
    return next()
  } else {
    loginWithRedirect({ appState: { targetUrl: to.fullPath } })
  }

  return next(false)
}
