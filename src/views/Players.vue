<template>
  <div class="container">
    <b-form-group>
      <select v-model="perPage" class="form-select w-25 m-auto" @change="resetCurrentPage">
        <option v-for="i in 5" :key="i * 5" :value="i * 5">{{ i * 5 }} Items</option>
      </select>
    </b-form-group>
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="handleClick"
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
      @page-click="handleClick"
    ></b-pagination>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Player from '@/components/Player.vue'

export default defineComponent({
  name: 'PlayersView',
  components: {
    Player,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 5,
      options: [
        { value: 5, text: '5' },
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 20, text: '20' },
        { value: 25, text: '25' },
      ],
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
      return player.bicon?.length
        ? player.bicon
        : player.tags[player.tags.length - 1].mysteryImageUrl
    },
    resetCurrentPage() {
      this.currentPage = 1
    },
    handleClick(event, pageNumber) {
      this.$router.push('/players/' + pageNumber)
    },
  },
})
</script>
