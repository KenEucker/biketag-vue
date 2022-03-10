<template>
  <template v-if="isNotLanding">
    <div class="spacer-top"></div>
    <bike-tag-menu variant="top" />
  </template>
  <service-worker />
  <router-view />
  <template v-if="isNotLanding">
    <bike-tag-menu variant="bottom" />
    <div class="spacer-bottom"></div>
  </template>
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
  },
  async mounted() {
    const initResults = []
    /// Set it first thing
    this.$store.dispatch('setDataInitialized')
    const game = await this.$store.dispatch('setGame')
    initResults.push(await this.$store.dispatch('setAllGames'))

    console.log('auth', this.$auth.isAuthenticated, this.$auth)
    await setTimeout(
      this.$nextTick(async () => {
        if (this.$auth.isAuthenticated) {
          console.log('is authed')
          if (!this.getProfile?.nonce?.length) {
            console.log('no profile nonce, setting profile')
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
      100
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

    console.log(`view::data-init`, initResults)
  },
})
</script>
<style lang="scss">
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
  margin-top: 100px;
}
@media (min-width: 550px) {
  .spacer-top {
    margin-top: 150px;
  }
}
</style>
