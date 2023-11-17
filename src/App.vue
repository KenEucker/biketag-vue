<template>
  <Head>
    <title>{{ title }}</title>
    <meta name="description" :content="description" />

    <!-- Social -->
    <meta property="og:title" :content="title" />
    <meta property="og:description" :content="description" />
    <meta property="og:image" :content="logo" />
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

<script setup name="App">
import { ref, inject, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index'
import { useAuth0 } from '@auth0/auth0-vue'
import { debug, isAuthenticationEnabled } from './common/utils'

// componets
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'
import { Head } from '@vueuse/head'
import { useI18n } from 'vue-i18n'

// data
const gameIsSet = ref(false)
const store = useStore()
const router = useRouter()
const { t } = useI18n()
const toast = inject('toast')

// computed
const isNotLanding = computed(() => gameIsSet.value && router.currentRoute.value.name != 'Landing')
const isWhiteBackground = computed(() =>
  router.currentRoute.value.name === 'About' ? 'white-bck' : '',
)
const logo = computed(() => store.getLogoUrl('m'))
const title = computed(function () {
  return `${isNotLanding.value ? store.getGameName : t('app.gameof')} BikeTag!`
})
const description = computed(() => `The BikeTag game in ${store.getGame?.region?.description}`)

onMounted(async () => {
  if (isAuthenticationEnabled()) {
    const checkAuth = async () => {
      if (auth0.isAuthenticated) {
        if (auth0.idTokenClaims.value) {
          if (store.getProfile?.sub !== auth0.user?.value?.sub) {
            const token = auth0.idTokenClaims?.value?.__raw
            await store.setProfile({ ...auth0.user.value, token })
          } else {
            console.log('profile already in store', store.getProfile)
          }
        }
      }
    }
    const auth0 = useAuth0()
    watch(auth0.isAuthenticated, checkAuth)
    watch(auth0.idTokenClaims, checkAuth)
  }
})

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
async function created() {
  const initResults = []
  /// Set it first thing
  store.SET_DATA_INITIALIZED()
  const game = await store.setGame()
  initResults.push(store.setAllGames())
  const _gameIsSet = game?.name?.length !== 0

  if (_gameIsSet && router.currentRoute.value.name !== 'landing') {
    gameIsSet.value = true

    if (!game) {
      router.push('/landing')
      gameIsSet.value = false
    }

    initResults.push(await store.setTags())
    initResults.push(await store.setCurrentBikeTag())
    initResults.push(await store.setQueuedTags())
    initResults.push(await store.setPlayers())
    initResults.push(await store.setLeaderboard())

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
