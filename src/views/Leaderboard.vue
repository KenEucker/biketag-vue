<template>
  <div class="container">
    <div class="player-list">
      <div v-for="player in playersList" :key="player.name" class="p-lg-1 p-md-1 mb-1">
        <player size="md" :player="player" />
      </div>
    </div>
  </div>
</template>
<script>
import { computed } from 'vue'
import { useStore } from '@/store/index.ts'
import Player from '@/components/PlayerBicon.vue'

export default {
  name: 'LeaderboardView',
  components: {
    Player,
  },
  setup() {
    const store = useStore

    // computed
    const playersList = computed(() => store.getLeaderboard)

    return {
      playersList,
    }
  },
}
</script>
<style lang="scss" scoped>
.player-list {
  @media (min-width: 1200px) {
    margin-top: 13em;
  }
}
</style>
