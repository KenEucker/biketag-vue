<template>
  <div class="container">
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
    <div
      v-masonry="containerId"
      transition-duration="0.3s"
      item-selector=".item"
      fit-width="true"
      class="m-auto"
    >
      <div
        v-for="player in playersForList"
        :key="player.name"
        v-masonry-tile
        class="item p-lg-3 p-md-2 mb-2"
      >
        <player size="md" :player-name="player.name" :player-avatar-url="playerAvatar(player)" />
      </div>
    </div>
    <b-form-group>
      <select v-model="perPage" class="form-select w-25 m-auto" @change="resetCurrentPage">
        <option v-for="i in 3" :key="Math.pow(10, i)" :value="Math.pow(10, i)">
          {{ Math.pow(10, i) }}
        </option>
      </select>
    </b-form-group>
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/PlayerAvatar.vue'

export default defineComponent({
  name: 'PlayersView',
  components: {
    Player,
  },
  data() {
    console.log(this.$route.params)
    return {
      currentPage: this.$route.params?.currentPage.length
        ? parseInt(this.$route.params?.currentPage)
        : 1,
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
  watch: {
    '$route.params.currentPage': function (val) {
      this.currentPage = Number(val)
    },
  },
  mounted() {
    this.$store.dispatch('setPlayers')
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
    resetCurrentPage() {
      this.currentPage = 1
    },
    changePage(event, pageNumber) {
      this.$router.push('/players/' + pageNumber)
    },
  },
})
</script>
