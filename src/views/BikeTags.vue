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
        <bike-tag :key="tag.tagnumber" :tag="tag" :reverse="true" />
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
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
  </loading>
</template>

<script>
import { defineComponent } from 'vue'
// import { mapGetters } from 'vuex'
import { useStore } from '@/store/pinia.ts'
import { storeToRefs } from 'pinia'
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
    store() {
      return useStore()
    },
    getTags() {
      const { getTags } = storeToRefs(this.store)

      return getTags
    },
    // ...mapGetters(['getTags']),
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
  },
})
</script>
