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
      <li v-for="player in playersForList" :key="player.name" class="mb-3">
        <player :player-name="player.name" :player-avatar-url="playerAvatar(player)" />
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
    ...mapGetters(['getPlayers']),
    playersForList() {
      return this.getPlayers.slice(
        (this.currentPage - 1) * this.perPage,
        this.currentPage * this.perPage
      )
    },
    totalCount() {
      return this.getPlayers.length
    },
  },
  mounted() {
    this.$store.dispatch('setPlayers')
  },
  methods: {
    playerAvatar(player) {
      return player.bicon ? player.bicon : player.tags[player.tags.length - 1].mysteryImageUrl
    },
  },
})
</script>
