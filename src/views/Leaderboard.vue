<template>
  <div class="container">
    <!-- We will go with a leaderboard of top10 (to be configurable) -->
    <!-- <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination> -->
    <div
      v-masonry="containerId"
      transition-duration="0.3s"
      item-selector=".item"
      fit-width="true"
      class="m-auto"
    >
      <div
        v-for="(player, index) in playersForList"
        :key="player.name"
        v-masonry-tile
        class="item p-lg-3 p-md-2 mb-2"
      >
        <player
          :player-pos="playerPosition(index)"
          :player-name="player.name"
          :tag-count="player.tags.length"
          :player-avatar-url="playerAvatar(player)"
        />
      </div>
    </div>
    <!-- <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination> -->
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/Player.vue'

export default defineComponent({
  name: 'LeaderboardView',
  components: {
    Player,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 10,
    }
  },
  computed: {
    ...mapGetters(['getPlayers']),
    playersForList() {
      /// We will go with a leaderboard of top10 (to be configurable)
      // return this.getPlayers.slice(
      //   (this.currentPage - 1) * this.perPage,
      //   this.currentPage * this.perPage
      // )
      return this.getPlayers.slice(0, 10)
    },
    // totalCount() {
    //   return this.getPlayers.length
    // },
  },
  mounted() {
    this.$store.dispatch('setTopPlayers')
  },
  methods: {
    playerPosition(index) {
      return index + 1 + (this.currentPage - 1) * this.perPage
    },
    playerAvatar(player) {
<<<<<<< HEAD
      let url
      if (player.bicon) {
        url = player.bicon
      } else if (player.tags[player.tags.length - 1].mysteryImageUrl) {
        url = player.tags[player.tags.length - 1].mysteryImageUrl
      } else {
        url = player.tags[player.tags.length - 1].foundImageUrl
      }
      return url
=======
      return player.bicon?.length
        ? player.bicon
        : player.tags[player.tags.length - 1].mysteryImageUrl
>>>>>>> 2ad140ec504a603402067c0ebd2c8b4f3380adca
    },
  },
})
</script>
