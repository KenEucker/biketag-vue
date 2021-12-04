<template>
  <b-spinner v-show="loading" />
  <div v-show="!loading" class="container">
    <!-- We will go with a leaderboard of top10 (to be configurable) -->
    <!-- <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination> -->
    <ul id="itemList" class="list-unstyled">
      <li v-for="(player, index) in playersForList" :key="player.name">
        <player
          :player-pos="playerPosition(index)"
          :player-name="player.name"
          :tag-count="player.tags.length"
          :player-avatar-url="player.bicon"
        />
      </li>
    </ul>
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
  name: 'PlayerList',
  components: {
    Player,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 10,
      loading: true,
    }
  },
  computed: {
    ...mapGetters(['getAllPlayers']),
    playersForList() {
      /// We will go with a leaderboard of top10 (to be configurable)
      // return this.getAllPlayers.slice(
      //   (this.currentPage - 1) * this.perPage,
      //   this.currentPage * this.perPage
      // )
      return this.getAllPlayers.slice(0, 10)
    },
    // totalCount() {
    //   return this.getAllPlayers.length
    // },
  },
  mounted() {
    this.$store.dispatch('setTopPlayers')
    this.loading = false
  },
  methods: {
    playerPosition(index) {
      return index + 1 + (this.currentPage - 1) * this.perPage
    },
  },
})
</script>
<style scoped></style>
