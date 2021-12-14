import createAuth0Client, {
  Auth0Client,
  Auth0ClientOptions,
  GetIdTokenClaimsOptions,
  GetTokenSilentlyOptions,
  GetTokenWithPopupOptions,
  LogoutOptions,
  PopupLoginOptions,
  RedirectLoginOptions,
  User,
} from '@auth0/auth0-spa-js'
import { App, computed, reactive, watchEffect, ComputedRef } from 'vue'
import { RouteLocationNormalized } from 'vue-router'

export type AuthState = {
  loading: boolean
  isAuthenticated: boolean
  user: User | undefined
  popupOpen: boolean
  error: any
}

let client: Auth0Client
const state: AuthState = reactive({
  loading: true,
  isAuthenticated: false,
  user: {},
  popupOpen: false,
  error: null,
})

/**
 * Authenticates the user using a popup window
 *
 * @param {PopupLoginOptions} o
 */
async function loginWithPopup(o?: PopupLoginOptions) {
  state.popupOpen = true

  try {
    await client.loginWithPopup(o)
  } catch (e) {
    console.error(e)
  } finally {
    state.popupOpen = false
  }

  state.user = await client.getUser()
  state.isAuthenticated = true
}

/**
 * Handles the callback when logging in using a redirect
 *
 *  @param {string} url
 */
async function handleRedirectCallback(url?: string) {
  state.loading = true

  try {
    await client.handleRedirectCallback(url)
    state.user = await client.getUser()
    state.isAuthenticated = true
  } catch (e) {
    state.error = e
  } finally {
    state.loading = false
  }
}

/**
 * Authenticates the user using the redirect method
 *
 * @param {RedirectLoginOptions} o
 */
function loginWithRedirect(o?: RedirectLoginOptions) {
  return client.loginWithRedirect(o)
}

/**
 * Returns all the claims present in the ID token
 *
 * @param {GetIdTokenClaimsOptions} o
 */
function getIdTokenClaims(o?: GetIdTokenClaimsOptions) {
  return client.getIdTokenClaims(o)
}

/**
 * Returns the access token. If the token is invalid or missing,
 * a new one is retrieved
 *
 * @param {GetTokenSilentlyOptions & { detailedResponse: true; }} o
 */
function getTokenSilently(
  o?: GetTokenSilentlyOptions & {
    detailedResponse: true
  }
) {
  return client.getTokenSilently(o)
}

/**
 * Gets the access token using a popup window
 *
 * @param {GetTokenWithPopupOptions} o
 */
function getTokenWithPopup(o?: GetTokenWithPopupOptions) {
  return client.getTokenWithPopup(o)
}

/**
 * Logs the user out and removes their session on the authorization server
 *
 * @param {LogoutOptions} o
 */
function logout(o?: LogoutOptions) {
  return client.logout(o)
}

export type AuthPlugin = {
  isAuthenticated: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  user: ComputedRef<User | undefined>
  getIdTokenClaims: typeof getIdTokenClaims
  getTokenSilently: typeof getTokenSilently
  getTokenWithPopup: typeof getTokenWithPopup
  handleRedirectCallback: typeof handleRedirectCallback
  loginWithRedirect: typeof loginWithRedirect
  loginWithPopup: typeof loginWithPopup
  logout: typeof logout
}

const authPlugin: AuthPlugin = {
  isAuthenticated: computed(() => state.isAuthenticated),
  loading: computed(() => state.loading),
  user: computed(() => state.user),
  getIdTokenClaims,
  getTokenSilently,
  getTokenWithPopup,
  handleRedirectCallback,
  loginWithRedirect,
  loginWithPopup,
  logout,
}

/**
 * Authorization guard to protect routes in our app from unauthorized users
 *
 * @param {RouteLocationNormalized} to
 * @param {RouteLocationNormalized} from
 * @param {*} next
 */
const routeGuard = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: Function) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (!requiresAuth) return next()

  const { isAuthenticated, loading, loginWithRedirect } = authPlugin

  const verify = () => {
    // If the user is authenticated, continue with the route
    if (isAuthenticated.value) {
      return next()
    }

    // Otherwise, log in
    loginWithRedirect({ appState: { targetUrl: to.fullPath } })
  }

  // If loading has already finished, check our auth state using `fn()`
  if (!loading.value) {
    return verify()
  }

  // Watch for the loading property to change before we check isAuthenticated
  watchEffect(() => {
    if (loading.value === false) {
      return verify()
    }
  })
}

async function init(options: Partial<Auth0ClientOptions>) {
  const { onRedirectCallback, redirectUri = window.location.origin } = options

  client = await createAuth0Client({
    domain: process.env.AUTH0_DOMAIN as string,
    client_id: process.env.AUTH0_CLIENT_ID as string,
    audience: options.audience,
    redirect_uri: redirectUri,
  })

  try {
    // If the user is returning to the app after authentication
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
      // handle the redirect and retrieve tokens
      const { appState } = await client.handleRedirectCallback()

      // Notify subscribers that the redirect callback has happened, passing the appState
      // (useful for retrieving any pre-authentication state)
      onRedirectCallback(appState)
    }
  } catch (e) {
    state.error = e
  } finally {
    // Initialize our internal authentication state
    state.isAuthenticated = await client.isAuthenticated()
    state.user = await client.getUser()
    state.loading = false
  }

  return {
    install: (app: App<Element>) => {
      app.config.globalProperties.$auth = authPlugin
    },
  }
}

export default {
  init,
  routeGuard,
}
