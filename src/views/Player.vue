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
    <ul id="itemList" class="list-unstyled">
      <li v-for="tag in tagsForList" :key="tag.tagnumber">
        <bike-tag
          :key="tag.tagnumber"
          :tag="tag"
          :found-tagnumber="tag.tagnumber - 1"
          :found-description="getSelfTagFoundDescription(tag)"
        />
      </li>
    </ul>
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
import BikeTag from '@/components/BikeTag.vue'
import biketag from 'biketag'
export default defineComponent({
  name: 'PlayerView',
  components: {
    BikeTag,
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
    // mix the getters into computed with object spread operator
    ...mapGetters(['getPlayers']),
    player() {
      const playerList = this.getPlayers.filter((player) => {
        const playerName = this.playerName()
        return decodeURIComponent(encodeURIComponent(player.name)) == playerName
      })
      const player = playerList[0]
      console.log({ player })
      return player
    },
    tagsForList() {
      const tags = this.player?.tags
      return tags
        ? tags
            .reverse()
            .slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage)
        : []
    },
    totalCount() {
      return this.player?.tags?.length
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
    resetCurrentPage() {
      this.currentPage = 1
    },
    playerName() {
      return decodeURIComponent(encodeURIComponent(this.$route.params.name))
    },
    getSelfTagFoundDescription(tag) {
      return biketag.getters.getImgurFoundDescriptionFromBikeTagData({
        ...tag,
        ...{ tagnumber: tag.tagnumber - 1 },
      })
    },
    changePage(event, pageNumber) {
      this.$router.push('/player/' + encodeURIComponent(this.playerName()) + '/' + pageNumber)
    },
  },
})
</script>
