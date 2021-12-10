<template>
  <div class="container">
    <div
      v-masonry="containerId"
      transition-duration="0.3s"
      item-selector=".item"
      fit-width="true"
      class="m-auto"
    >
      <div
        v-for="(player, index) in playersList"
        :key="player.name"
        v-masonry-tile
        class="item p-lg-3 p-md-2 mb-2"
      >
        <player
          :player-pos="index + 1"
          :player-name="player.name"
          :tag-count="player.tags.length"
          :player-avatar-url="playerAvatar(player)"
        />
      </div>
    </div>
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
    playersList() {
      return this.getPlayers.slice(0, 10)
    },
  },
  mounted() {
    this.$store.dispatch('setTopPlayers')
  },
  methods: {
    playerAvatar(player) {
      let url
      if (player.bicon) {
        url = player.bicon
      } else if (player.tags[player.tags.length - 1].mysteryImageUrl) {
        url = player.tags[player.tags.length - 1].mysteryImageUrl
      } else {
        url = player.tags[player.tags.length - 1].foundImageUrl
      }
      return url
    },
  },
})
</script>
