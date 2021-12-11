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
    <div>
      <div v-for="tag in tagsList" :key="tag.tagnumber" v-masonry-tile class="item">
        <bike-tag :key="tag.tagnumber" :tag="tag" @load="tagLoaded(tagsList.tagnumber)" />
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
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="images/SpinningBikeV1.svg" />
  </loading>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'BikeDexView',
  components: {
    BikeTag,
    Loading,
  },
  data() {
    console.log(this.$route.params)
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
    ...mapGetters(['getCurrentBikeTag', 'getTags']),
    tagsList() {
      return this.getTags.slice(
        (this.currentPage - 1) * this.perPage + 1, // exclude current mystery tag
        this.currentPage * this.perPage + 1 // exclude current mystery tag
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
  mounted() {
    this.$store.dispatch('setTags')
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
      this.$router.push('/bikedex/' + pageNumber)
    },
    startLoading() {
      this.tagsLoaded = []
      this.tagsAreLoading = true
      setTimeout(() => {
        this.tagsAreLoading = false
      }, 2000)
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
