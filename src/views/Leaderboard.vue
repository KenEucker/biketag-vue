<template>
  <div class="container">
    <div v-masonry transition-duration="0.3s" item-selector=".item" fit-width="true" class="m-auto">
      <div
        v-for="player in playersList"
        :key="player.name"
        v-masonry-tile
        class="item p-lg-3 p-md-2 mb-2"
      >
        <player size="md" :player="player" />
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/PlayerBicon.vue'

export default defineComponent({
  name: 'LeaderboardView',
  components: {
    Player,
  },
  computed: {
    ...mapGetters(['getLeaderboard']),
    playersList() {
      return this.getLeaderboard
    },
  },
  async created() {
    await this.$store.dispatch('setLeaderboard')
  },
})
</script>
