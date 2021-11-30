<template>
  <div class="container">
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination>
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
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination>
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
    }
  },
  computed: {
    ...mapGetters(['getAllPlayers']),
    playersForList() {
      return this.getAllPlayers.slice(
        (this.currentPage - 1) * this.perPage,
        this.currentPage * this.perPage
      )
    },
    totalCount() {
      return this.getAllPlayers.length
    },
  },
  mounted() {
    this.$store.dispatch('setTopPlayers')
  },
  methods: {
    playerPosition(index) {
      return index + 1 + (this.currentPage - 1) * this.perPage
    },
  },
})
</script>
<style scoped></style>
