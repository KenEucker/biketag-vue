<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container">
    <div class="player-list">
      <div v-for="player in playersList" :key="player.name" class="mb-1 p-lg-1 p-md-1">
        <player size="md" :player="player" />
      </div>
    </div>
  </div>
</template>

<script setup name="LeaderboardView">
import { computed } from 'vue'
import { useBikeTagStore } from '@/store/index'

// components
import Player from '@/components/BikeTagPlayer.vue'

// data
const store = useBikeTagStore()

store.isReady().then(() => store.fetchLeaderboardPlayersProfiles())

// computed
const playersList = computed(() => store.getLeaderboard)
</script>
<style lang="scss" scoped>
.player-list {
  @media (width >= 1200px) {
    margin-top: 13em;
  }
}
</style>
