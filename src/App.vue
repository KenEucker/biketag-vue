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
    <!-- <template v-if="isNotLanding">
      <bike-tag-menu variant="bottom" />
      <div class="spacer-bottom"></div>
    </template> -->
  </div>
</template>
<script>
import { ref, inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index.ts'
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'
import { debug } from './common/utils'
import { Head } from '@vueuse/head'
import i18n from '@/i18n'

export default {
  name: 'App',
  components: {
    ServiceWorker,
    BikeTagMenu,
    Head,
  },
  setup() {
    // data
    let gameIsSet = ref(false)
    const store = useStore()
    const router = useRouter()
    const auth = inject('auth0')
    const toast = inject('toast')

    // computed
    // eslint-disable-next-line prettier/prettier
    const isNotLanding = computed(() => gameIsSet.value && router.currentRoute.value.name != 'Landing')
    // eslint-disable-next-line prettier/prettier
    const isWhiteBackground = computed(() => router.currentRoute.value.name === 'About' ? 'white-bck' : '')
    const logo = computed(() => store.getLogoUrl('m'))
    // eslint-disable-next-line prettier/prettier
    const title = computed(function() { return `${isNotLanding.value ? store.getGameName : i18n.global.t('The Game Of')} BikeTag!` })
    const description = computed(() => `The BikeTag game in ${store.getGame?.region?.description}`)

    // methods
    function checkForNewBikeTagPost() {
      if (
        store.getCurrentBikeTag?.tagnumber > store.getMostRecentlyViewedTagnumber &&
        store.getMostRecentlyViewedTagnumber !== 0
      ) {
        debug('ui::new biketag posted!!')
        toast.open({
          message: `Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameName} has been posted!`,
          type: 'default',
          position: 'top',
        })
      }
    }

    // created
    function checkAuth() {
      if (auth?.isAuthenticated) {
        if (!this.getProfile?.nonce?.length) {
          auth.getIdTokenClaims().then((claims) => {
            if (claims) {
              const token = claims.__raw
              store.setProfile({ ...auth.user, token })
            } else {
              debug("what's this? no speaka da mda5hash, brah?")
            }
          })
        }
        return true
      }
      return false
    }

    async function created() {
      const initResults = []
      /// Set it first thing
      store.SET_DATA_INITIALIZED()
      const game = await store.setGame()
      initResults.push(await store.setAllGames())
      const _gameIsSet = game?.name?.length !== 0

      if (_gameIsSet && router.currentRoute.value.name !== 'landing') {
        gameIsSet = true

        setTimeout(() => {
          if (!checkAuth()) {
            setTimeout(() => checkAuth, 1000)
          }
        }, 1000)

        setTimeout(
          await nextTick(() => {
            if (!game) {
              router.push('/landing')
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
        router.push('/landing')
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
