<template>
  <div :class="isWhiteBackground">
    <template v-if="isNotLanding">
      <div :class="`spacer-top ${isWhiteBackground}`"></div>
      <bike-tag-menu variant="top" />
    </template>
    <service-worker />
    <router-view />
    <template v-if="isNotLanding">
      <bike-tag-menu variant="bottom" />
      <div class="spacer-bottom"></div>
    </template>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'

export default defineComponent({
  name: 'App',
  components: {
    ServiceWorker,
    BikeTagMenu,
  },
  data() {
    return {
      gameIsSet: true,
    }
  },
  computed: {
    ...mapGetters(['getProfile']),
    isNotLanding() {
      return this.gameIsSet && this.$router.currentRoute.value.name != 'Landing'
    },
    isWhiteBackground() {
      return this.$router.currentRoute.value.name === 'About' ? 'white-bck' : ''
    },
  },
  async mounted() {
    const initResults = []
    /// Set it first thing
    this.$store.dispatch('setDataInitialized')
    const game = await this.$store.dispatch('setGame')
    initResults.push(await this.$store.dispatch('setAllGames'))

    await setTimeout(
      this.$nextTick(async () => {
        if (this.$auth.isAuthenticated) {
          if (!this.getProfile?.nonce?.length) {
            this.$auth.getIdTokenClaims().then((claims) => {
              if (claims) {
                const token = claims.__raw
                this.$store.dispatch('setProfile', { ...this.$auth.user, token })
              } else {
                console.log("what's this? no speaka da mda5hash, brah?")
              }
            })
          }
        }
      }),
      1000
    )

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

    console.log(`view::data-init`)
  },
})
</script>
<style lang="scss">
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
  height: 100px;
  @media (min-width: 990px) {
    margin-top: 190px;
  }
}
</style>
