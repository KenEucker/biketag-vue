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
      <li v-for="tag in tagsForList" :key="tag.tagnumber">
        <bike-tag
          :key="tag.tagnumber"
          :tagnumber="tag.tagnumber"
          :found-image-url="tag.foundImageUrl"
          :mystery-image-url="tag.mysteryImageUrl"
          :player="tag.player"
          :found-description="foundDescription(tag.tagnumber, tag.foundLocation, tag.player)"
          :mystery-description="mysteryDescription(tag.tagnumber, tag.hint, tag.player)"
        />
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
import BikeTag from '@/components/BikeTag.vue'

export default defineComponent({
  name: 'HomePage',
  components: {
    BikeTag,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 10,
    }
  },
  computed: {
    ...mapGetters(['getLastTag', 'getAllTags']),
    tagsForList() {
      return this.getAllTags.slice(
        (this.currentPage - 1) * this.perPage + 1, // exclude current mystery tag
        this.currentPage * this.perPage + 1 // exclude current mystery tag
      )
    },
    totalCount() {
      return this.getAllTags.length
    },
  },
  mounted() {
    this.$store.dispatch('setAllTags')
  },
  methods: {
    foundDescription(tagnum, foundLocation, player) {
      return '#' + tagnum + ' PROOF FOUND AT ( ' + foundLocation + ' ) BY ' + player
    },
    mysteryDescription(tagnum, hint, player) {
      return '#' + tagnum + ' TAG ( HINT: ' + hint + ' ) BY ' + player
    },
  },
})
</script>
<style scoped></style>
