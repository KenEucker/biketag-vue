<template>
  <div class="container">
    <ul id="itemList" class="list-unstyled">
      <li v-for="(player, index) in playersForList" :key="player.name" class="mb-3">
        <player
          :player-pos="playerPosition(index)"
          :player-name="player.name"
          :tag-count="player.tags.length"
          :player-avatar-url="playerAvatar(player)"
        />
      </li>
    </ul>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/PlayerAvatar.vue'

export default defineComponent({
  name: 'LeaderboardView',
  components: {
    Player,
  },
  computed: {
    ...mapGetters(['getPlayers']),
    playersForList() {
      return this.getPlayers.slice(0, 10)
    },
  },
  mounted() {
    this.$store.dispatch('setTopPlayers')
  },
  methods: {
    playerAvatar(player) {
      return player.bicon?.length
        ? player.bicon
        : player.tags[player.tags.length - 1].mysteryImageUrl
    },
  },
})
</script>
