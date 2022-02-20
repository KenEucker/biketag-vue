<template>
  <div v-if="totalCount > 1" class="container">
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
    <div class="m-auto">
      <div v-for="tag in tagsList" :key="tag.tagnumber">
        <bike-tag
          :key="tag.tagnumber"
          :tag="tag"
          :reverse="true"
          :found-player="getPlayer(tag.foundPlayer)"
          :mystery-player="getPlayer(tag.mysteryPlayer)"
          @load="tagLoaded(tagsList.tagnumber)"
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
  <div v-else class="container mt-4 mb-5">
    <span class="body-text">
      completed BikeTag Posts will show up here once round #1 has been found!
    </span>
  </div>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'BikeTagsView',
  components: {
    BikeTag,
    Loading,
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
    ...mapGetters(['getTags', 'getPlayers']),
    tagsList() {
      return this.getTags.slice(
        (this.currentPage - 1) * this.perPage + (this.currentPage === 1 ? 1 : 0), // exclude current mystery tag
        this.currentPage * this.perPage // exclude current mystery tag
      )
    },
    totalCount() {
      return this.getTags.length
    },
  },
  watch: {
    '$route.params.currentPage': function (val) {
      this.currentPage = Number(val)
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
  },
  created() {
    this.startLoading()
  },
  methods: {
    resetCurrentPage() {
      this.startLoading()
      this.currentPage = 1
    },
    changePage(event, pageNumber) {
      this.startLoading()
      this.$router.push('/biketags/' + pageNumber)
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
    getPlayer(playerName) {
      const playerList =
        this.getPlayers?.filter((player) => {
          return decodeURIComponent(encodeURIComponent(player.name)) == playerName
        }) ?? []
      return playerList[0]
    },
    tagLoaded() {
      /// Remove?
    },
    //   const tagNotLoaded = this.tagsLoaded.indexOf(loadedTagNumber) === -1

    //   if (tagNotLoaded) {
    //     this.tagsLoaded.push(loadedTagNumber)
    //   }

    //   const currentTags = this.tagsList()
    //   if (this.tagsLoaded.length === currentTags.length) {
    //     const allTagsLoaded = currentTags.reduce(
    //       (loaded, t) => loaded && this.tagsLoaded.indexOf(t.tagnumber) !== -1,
    //       true
    //     )
    //     if (allTagsLoaded) {
    //       this.tagsAreLoading = false
    //     }
    //   }
    // },
  },
})
</script>
