import { createApp } from 'vue'
import createAuth0Client from '@auth0/auth0-spa-js'

const DEFAULT_REDIRECT_CALLBACK = (state: any) =>
  window.history.replaceState(state, document.title, window.location.pathname)

let instance: any

export const getInstance = () => instance

export const useAuth0 = ({
  onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
  redirectUri = window.location.origin,
  ...options
}) => {
  if (instance) return instance

  instance = createApp({
    data() {
      return {
        loading: true,
        isAuthenticated: false,
        user: {},
        auth0Client: null,
        popupOpen: false,
        error: null,
      }
    },
    async created() {
      this.auth0Client = await createAuth0Client({
        ...options,
        client_id: options.clientId,
        domain: options.domain,
        redirect_uri: redirectUri,
      })

      try {
        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
          const { appState } = await this.auth0Client.handleRedirectCallback()
          this.error = null
          onRedirectCallback(appState)
        }
      } catch (e) {
        this.error = e
      } finally {
        this.isAuthenticated = await this.auth0Client.isAuthenticated()
        this.user = await this.auth0Client.getUser()
        this.loading = false
      }
    },
    methods: {
      async loginWithPopup(options: any, config: any) {
        this.popupOpen = true

        try {
          await this.auth0Client.loginWithPopup(options, config)
          this.user = await this.auth0Client.getUser()
          this.isAuthenticated = await this.auth0Client.isAuthenticated()
          this.error = null
        } catch (e) {
          console.error(e)
          this.error = e
        } finally {
          this.popupOpen = false
        }
      },
      async handleRedirectCallback() {
        this.loading = true
        try {
          await this.auth0Client.handleRedirectCallback()
          this.user = await this.auth0Client.getUser()
          this.isAuthenticated = true
          this.error = null
        } catch (e) {
          this.error = e
        } finally {
          this.loading = false
        }
      },
      loginWithRedirect(o: any) {
        return this.auth0Client.loginWithRedirect(o)
      },
      getIdTokenClaims(o: any) {
        return this.auth0Client.getIdTokenClaims(o)
      },
      getTokenSilently(o: any) {
        return this.auth0Client.getTokenSilently(o)
      },
      getTokenWithPopup(o: any) {
        return this.auth0Client.getTokenWithPopup(o)
      },
      logout(o: any) {
        return this.auth0Client.logout(o)
      },
    },
  }).mount(document.createElement('div'))

  return instance
}

export const Auth0Plugin = {
  install(app: any, options: any) {
    app.config.globalProperties.$auth = useAuth0(options)
  },
}
