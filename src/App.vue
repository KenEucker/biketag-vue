<template>
  <Head>
    <title>{{ title }}</title>
    <!-- Social -->
    <meta property="og:title" :content="title" />
    <meta property="og:description" :content="description" />
    <meta property="og:image" :content="logo" />

    <!-- Twitter -->
    <meta name="twitter:title" :content="title" />
    <meta name="twitter:description" :content="description" />
    <meta name="twitter:image" :content="logo" />
  </Head>
  <div :class="isWhiteBackground">
    <template v-if="isNotLanding">
      <div :class="`spacer-top ${isWhiteBackground}`"></div>
      <bike-tag-menu variant="top" />
    </template>
    <service-worker />
    <router-view />
  </div>
</template>
<script>
import { ref, computed } from 'vue'
import { useStore } from '@/store/index.ts'
import { debug } from './common/utils'
import { Head } from '@vueuse/head'

export default {
  name: 'App',
  components: {
    Head,
  },
  setup() {
    // data
    let gameIsSet = ref(false)
    const store = useStore()

    // computed
    // eslint-disable-next-line prettier/prettier
    const isNotLanding = computed(() => gameIsSet.value && this.$router.currentRoute.value.name != 'Landing')
    // eslint-disable-next-line prettier/prettier
    const isWhiteBackground = computed(() => this.$router.currentRoute.value.name === 'About' ? 'white-bck' : '')
    const logo = computed(() => store.getLogoUrl('m'))
    // eslint-disable-next-line prettier/prettier
    const title = computed(() => `${isNotLanding.value ? store.getGameName : this.$t('The Game Of')} BikeTag!`)
    const description = computed(() => `The BikeTag game in ${store.getGame?.region?.description}`)

    // methods
    function checkForNewBikeTagPost() {
      if (
        store.getCurrentBikeTag?.tagnumber > store.getMostRecentlyViewedTagnumber &&
        store.getMostRecentlyViewedTagnumber !== 0
      ) {
        debug('ui::new biketag posted!!')
        this.$toast.open({
          message: `Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameName} has been posted!`,
          type: 'default',
          position: 'top',
        })
      }
    }
    async function created() {
      const initResults = []
      /// Set it first thing
      store.SET_DATA_INITIALIZED()
      const game = await store.setGame()
      initResults.push(await store.setAllGames())
      const _gameIsSet = game?.name?.length !== 0

      if (_gameIsSet && this.$router.currentRoute.value.name !== 'landing') {
        gameIsSet = true

        const checkAuth = () => {
          if (this.$auth?.isAuthenticated) {
            if (!this.getProfile?.nonce?.length) {
              this.$auth.getIdTokenClaims().then((claims) => {
                if (claims) {
                  const token = claims.__raw
                  store.setProfile({ ...this.$auth.user, token })
                } else {
                  debug("what's this? no speaka da mda5hash, brah?")
                }
              })
            }
            return true
          }
          return false
        }

        setTimeout(() => {
          if (!checkAuth()) {
            setTimeout(() => checkAuth, 1000)
          }
        }, 1000)

        setTimeout(
          this.$nextTick(() => {
            if (!game) {
              this.$router.push('/landing')
              gameIsSet = false
              return
            }
          }),
          100
        )

        initResults.push(await store.setTags())
        initResults.push(await store.setCurrentBikeTag())
        initResults.push(await store.setQueuedTags())
        initResults.push(await store.setPlayers())
        initResults.push(await store.setLeaderboard())

        checkForNewBikeTagPost()
      } else if (!_gameIsSet) {
        this.$router.push('/landing')
      }
      debug(`view::data-init`)
    }

    created()

    return { gameIsSet, isWhiteBackground, logo, title, description }
  },
}
</script>
<style lang="scss">
@import './assets/styles/style';

.white-bck {
  background: white !important;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  overflow: hidden;
}

.spacer-bottom {
  margin-bottom: 50px;
}

.spacer-top {
  height: 85px;
  @media (min-width: 990px) {
    height: 105px;
  }
  @media (min-width: $breakpoint-desktop) {
    height: 130px;
  }
}
</style>
