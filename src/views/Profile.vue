<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container">
    YOU MADE IT!
    <div class="d-flex justify-content-center">
      <player size="lg" :player="player" :no-link="true" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/PlayerBicon.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'PlayerView',
  components: {
    Loading,
    Player,
  },
  computed: {
    // mix the getters into computed with object spread operator
    ...mapGetters(['getPlayers']),
    player() {
      const playerList = this.getPlayers.filter((player) => {
        const playerName = this.playerName()
        return decodeURIComponent(encodeURIComponent(player.name)) == playerName
      })
      const player = playerList[0]
      console.log({ player })
      return player
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
  },
  methods: {
    playerName() {
      return decodeURIComponent(encodeURIComponent(this.$route.params.name))
    },
  },
})
</script>
