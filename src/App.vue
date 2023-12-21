<template>
  <Head>
    <title>{{ title }}</title>
    <meta name="description" :content="description" />

    <!-- Social -->
    <meta property="og:site_name" :content="siteName" />
    <meta property="og:title" :content="title" />
    <meta property="og:description" :content="description" />
    <meta property="og:image" :content="logo" />
  </Head>
  <div :class="isWhiteBackground">
    <template v-if="isNotLanding">
      <div :class="`spacer-top ${isWhiteBackground}`"></div>
      <bike-tag-menu variant="top" />
    </template>
    <confetti-explosion v-if="showConfetti" />
    <service-worker />
    <router-view />
    <!-- <template v-if="isNotLanding">
      <bike-tag-menu variant="bottom" />
      <div class="spacer-bottom"></div>
    </template> -->
  </div>
</template>

<script setup name="App">
import { ref, inject, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index'
import { useAuth0 } from '@auth0/auth0-vue'
import { debug, isAuthenticationEnabled } from './common/utils'
import ConfettiExplosion from 'vue-confetti-explosion'

// componets
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'
import { Head } from '@vueuse/head'
import { useI18n } from 'vue-i18n'

// data
const gameIsSet = ref(false)
const showConfetti = ref(false)
const store = useStore()
const router = useRouter()
const { t } = useI18n()
const toast = inject('toast')
const auth0 = isAuthenticationEnabled() ? useAuth0() : undefined

// computed
const isLogout = computed(() => router.currentRoute.value.name === 'Logout')
const isNotLanding = computed(() => gameIsSet.value && router.currentRoute.value.name !== 'Landing')
const isWhiteBackground = computed(() =>
  router.currentRoute.value.name === 'About' ? 'white-bck' : '',
)
const logo = computed(() => store.getLogoUrl('m'))
const siteName = computed(() => `BikeTag ${store.getGameName}`)
const title = computed(function () {
  return `${isNotLanding.value ? store.getGameName : t('app.gameof')} BikeTag!`
})
const description = computed(() => `The BikeTag game in ${store.getGame?.region?.description}`)

onMounted(async () => {
  nextTick(async () => {
    await router.isReady()

    if (isLogout.value) {
      if (auth0?.isAuthenticated.value) {
        await store.setProfile()
        const returnTo = `${window.location.origin}/logout`
        await auth0.logout({
          returnTo,
        })
      }
      router.push('/')
    }
  })

  if (auth0) {
    const checkAuth = async () => {
      if (auth0.isAuthenticated.value) {
        if (auth0.idTokenClaims.value) {
          if (store.getProfile?.sub !== auth0.user?.value?.sub) {
            const token = auth0.idTokenClaims?.value?.__raw
            await store.setProfile({ ...auth0.user.value, token })
          }
        }
      }
    }
    watch(auth0.isAuthenticated, checkAuth)
    watch(auth0.idTokenClaims, checkAuth)
    // checkAuth()
  }
})

// methods
function checkForNewBikeTagPost() {
  if (
    store.getCurrentBikeTag?.tagnumber > store.getMostRecentlyViewedTagnumber &&
    store.getMostRecentlyViewedTagnumber !== 0
  ) {
    debug('ui::new biketag posted!!')
    const visitingPlayerWonMostRecent =
      store.getCurrentBikeTag?.player?.id === store.getProfile?.sub ||
      store.getCurrentBikeTag?.player?.name === store.getProfile?.name

    if (visitingPlayerWonMostRecent) {
      toast.success(
        `YOU WON Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameName}!!`,
        { type: 'default', position: 'top' },
      )
      showConfetti.value = true
      setTimeout(() => {
        showConfetti.value = false
      }, 3000)
    } else {
      toast.open({
        message: `Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameName} has been posted!`,
        type: 'default',
        position: 'top',
      })
    }
  }
}

// created
async function created() {
  const initResults = []
  /// Set it first thing
  store.SET_DATA_INITIALIZED()
  const game = await store.setGame()
  const _gameIsSet = game?.name?.length !== 0

  initResults.push(store.setAllGames())
  if (_gameIsSet && router.currentRoute.value.name !== 'landing') {
    gameIsSet.value = true

    if (!game) {
      router.push('/landing')
      gameIsSet.value = false
    }

    initResults.push(await store.setCurrentBikeTag())
    initResults.push(await store.setTags())
    initResults.push(store.setPlayers())
    initResults.push(store.setLeaderboard())
    initResults.push(await store.fetchCredentials())
    initResults.push(store.setQueuedTags())

    await Promise.allSettled(initResults)

    checkForNewBikeTagPost()
  } else if (!_gameIsSet) {
    router.push('/landing')
  }
  debug(`view::data-init`, 'created')
}
created()
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

  @media (width >=990px) {
    height: 105px;
  }

  @media (min-width: $breakpoint-desktop) {
    height: 130px;
  }
}
</style>
