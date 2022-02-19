<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV2.svg" />
  </loading>
  <div class="container">
    <div class="d-flex justify-content-center">
      <player size="lg" :player="player" :no-link="true" />
    </div>
    <div>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalCount"
        :per-page="perPage"
        aria-controls="itemList"
        align="center"
        @page-click="changePage"
      ></b-pagination>
      <div class="player-tags m-auto">
        <div v-for="tag in tagsForList" :key="tag.tagnumber">
          <bike-tag
            :key="tag.tagnumber"
            :tag="tag"
            :found-player="' '"
            :mystery-player="' '"
            :found-tagnumber="tag.tagnumber - 1"
            :found-description="getSelfTagFoundDescription(tag)"
          />
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
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import biketag from 'biketag'
import Player from '@/components/PlayerBicon.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'PlayerView',
  components: {
    BikeTag,
    Loading,
    Player,
  },
  data() {
    return {
      currentPage: this.$route.params?.currentPage.length
        ? parseInt(this.$route.params?.currentPage)
        : 1,
      perPage: 10,
      tagsAreLoading: true,
      tagsLoaded: [],
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
  created() {
    this.startLoading()
  },
  async mounted() {
    this.tagsAreLoading = true
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
    this.tagsAreLoading = false
  },
  methods: {
    resetCurrentPage() {
      this.startLoading()
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
      this.startLoading()
      this.$router.push('/player/' + encodeURIComponent(this.playerName()) + '/' + pageNumber)
    },
    startLoading() {
      this.tagsLoaded = []
      this.tagsAreLoading = true
      if (this.perPage <= 10) {
        setTimeout(() => {
          this.tagsAreLoading = false
        }, 500)
      }
    },
    tagLoaded() {
      /// Remove?
    },
  },
})
</script>
