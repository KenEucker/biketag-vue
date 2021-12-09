<template>
  <div class="container">
    <b-form-group>
      <b-form-select
        v-model="perPage"
        class="w-25 m-auto"
        :options="options"
        size="sm"
        @change="resetCurrentPage"
      ></b-form-select>
    </b-form-group>
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
    ></b-pagination>
    <ul id="itemList" class="list-unstyled">
      <li v-for="tag in tagsForList" :key="tag.tagnumber">
        <bike-tag :key="tag.tagnumber" :tag="tag" />
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
// import Spinner from 'vue-easy-spinner/package/Spinner.vue'
import BikeTag from '@/components/BikeTag.vue'

export default defineComponent({
  name: 'BikeDexView',
  components: {
    BikeTag,
    // Spinner,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 5,
      options: [
        { value: 5, text: '5 Items' },
        { value: 10, text: '10 Items' },
        { value: 15, text: '15 Items' },
        { value: 20, text: '20 Items' },
        { value: 25, text: '25 Items' },
      ],
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
  mounted() {
    this.$store.dispatch('setTags')
  },
  methods: {
    resetCurrentPage() {
      this.currentPage = 0
    },
  },
})
</script>
