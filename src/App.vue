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
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'
import { debug } from './common/utils'
import { Head } from '@vueuse/head'

export default defineComponent({
  name: 'App',
  components: {
    ServiceWorker,
    BikeTagMenu,
    Head,
  },
  data() {
    return {
      gameIsSet: true,
    }
  },
  computed: {
    ...mapGetters([
      'getProfile',
      'getMostRecentlyViewedTagnumber',
      'getCurrentBikeTag',
      'getGameName',
      'getGame',
      'getLogoUrl',
    ]),
    isNotLanding() {
      return this.gameIsSet && this.$router.currentRoute.value.name != 'Landing'
    },
    isWhiteBackground() {
      return this.$router.currentRoute.value.name === 'About' ? 'white-bck' : ''
    },
    logo() {
      return this.getLogoUrl('m')
    },
    title() {
      return `${this.gameName()} BikeTag!`
    },
    description() {
      return `The BikeTag game in ${this.getGame?.region?.description}`
    },
  },
  async created() {
    const initResults = []
    /// Set it first thing
    this.$store.dispatch('setDataInitialized')
    const game = await this.$store.dispatch('setGame')
    initResults.push(await this.$store.dispatch('setAllGames'))

    const checkAuth = () => {
      if (this.$auth.isAuthenticated) {
        if (!this.getProfile?.nonce?.length) {
          this.$auth.getIdTokenClaims().then((claims) => {
            if (claims) {
              const token = claims.__raw
              this.$store.dispatch('setProfile', { ...this.$auth.user, token })
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

    await setTimeout(
      this.$nextTick(() => {
        if (!game) {
          this.$router.push('/landing')
          this.gameIsSet = false
          return
        }
      }),
      100
    )

    initResults.push(await this.$store.dispatch('setTags'))
    initResults.push(await this.$store.dispatch('setCurrentBikeTag'))
    initResults.push(await this.$store.dispatch('setQueuedTags'))
    initResults.push(await this.$store.dispatch('setPlayers'))
    initResults.push(await this.$store.dispatch('setLeaderboard'))

    this.checkForNewBikeTagPost()
    debug(`view::data-init`)
  },
  methods: {
    gameName() {
      return this.getGameName.replace(/(\w)(\w*)/g, function (g0, g1, g2) {
        return g1.toUpperCase() + g2.toLowerCase()
      })
    },
    checkForNewBikeTagPost() {
      if (
        this.getCurrentBikeTag.tagnumber > this.getMostRecentlyViewedTagnumber &&
        this.getMostRecentlyViewedTagnumber !== 0
      ) {
        debug('ui::new biketag posted!!')
        this.$toast.open({
          message: `Round #${this.getCurrentBikeTag.tagnumber} of BikeTag ${this.getGameName} has been posted!`,
          type: 'default',
          position: 'top',
        })
      }
    },
  },
})
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
