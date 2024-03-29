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
    <div :class="`spacer-top ${isWhiteBackground}`"></div>
    <bike-tag-menu variant="top" />
    <confetti-explosion v-if="showConfetti" />
    <service-worker />
    <router-view />
    <!-- <template v-if="!isNotLanding">
      <bike-tag-menu variant="bottom" />
      <div class="spacer-bottom"></div>
    </template> -->
  </div>
</template>

<script setup name="App">
import { ref, inject, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
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
const store = useBikeTagStore()
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
const siteName = computed(
  () => `BikeTag ${store.getGameNameProper?.length ? store.getGameNameProper : 'Game'}`,
)
const title = computed(function () {
  return `${isNotLanding.value ? store.getGameNameProper : t('app.gameof')} BikeTag!`
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
          const token = auth0.idTokenClaims?.value?.__raw
          /// Always get more profile info
          if (
            store.getProfile?.sub !== auth0.user?.value?.sub ||
            !store.getProfile?.user_metadata?.name?.length
          ) {
            await store.setProfile(auth0.user.value, token)
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
    let showNewRoundNotification = true
    debug('ui::new biketag posted!!', store.getCurrentBikeTag.tagnumber)
    if (store.getCurrentBikeTag?.playerId?.length && store.getProfile?.sub?.length) {
      const playerIdMatches = store.getCurrentBikeTag.playerId === store.getProfile.sub
      const playerName = store.getProfile.user_metadata?.name
      const playerNameMatches = store.getCurrentBikeTag.mysteryPlayer === playerName
      const visitingPlayerWonMostRecent =
        playerIdMatches && ((!!playerName && playerNameMatches) || !playerName)

      if (visitingPlayerWonMostRecent) {
        toast.success(
          `YOU WON Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameNameProper}!!`,
          { type: 'default', position: 'top' },
        )
        showConfetti.value = true
        setTimeout(() => {
          showConfetti.value = false
        }, 3000)
        showNewRoundNotification = false
      }
    }
    if (showNewRoundNotification) {
      toast.open({
        message: `Round #${store.getCurrentBikeTag.tagnumber} of BikeTag ${store.getGameNameProper} has been posted!`,
        type: 'default',
        position: 'top',
      })
    }
  }
}

// created
async function created() {
  /// Set it first thing
  await router.isReady()
  const _gameIsSet = store.gameName?.length !== 0
  const routeIsRoot = router.currentRoute.value.path === '/'
  const routeIsLanding = router.currentRoute.value.name === 'Landing'

  if (_gameIsSet && (!routeIsLanding || routeIsRoot)) {
    const game = await store.setGame().catch((err) => {
      debug('view::data-init', err)
      // router.push('/landing')
    })
    gameIsSet.value = true
    const routeIsHome = routeIsRoot ? true : router.currentRoute.value?.name === 'Home'

    if (game && routeIsHome) {
      const tagnumber =
        router.currentRoute.value.path.length > 1
          ? parseInt(router.currentRoute.value.path.split('/')[1])
          : undefined
      const params = { tagnumber }
      await router.push({ name: 'Home', params })
    }
    await store.FetchAllData({ currentBikeTagSync: true, credentialsSync: true })

    checkForNewBikeTagPost()
  } else if (!_gameIsSet) {
    await store.fetchAllGames()
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
  font-family: $default-font-family;
  font-size: $default-font-size;
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
