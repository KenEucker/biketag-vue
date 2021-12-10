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
      <div v-for="tag in tagsForList" :key="tag.tagnumber" v-masonry-tile class="item">
        <bike-tag :key="tag.tagnumber" :tag="tag" />
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
import BikeTag from '@/components/BikeTag.vue'

export default defineComponent({
  name: 'BikeDexView',
  components: {
    BikeTag,
    // Spinner,
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
    ...mapGetters(['getCurrentBikeTag', 'getTags']),
    tagsForList() {
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
  methods: {
    resetCurrentPage() {
      this.currentPage = 1
    },
    changePage(event, pageNumber) {
      this.$router.push('/bikedex/' + pageNumber)
    },
  },
})
</script>
