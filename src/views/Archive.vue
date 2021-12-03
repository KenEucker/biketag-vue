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
          :mystery-player="tag.mysteryPlayer"
          :found-player="tag.foundPlayer"
          :found-description="getImgurFoundDescriptionFromBikeTagData(tag)"
          :mystery-description="getImgurMysteryDescriptionFromBikeTagData(tag)"
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
import biketag from 'biketag'

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
    getImgurFoundDescriptionFromBikeTagData:
      biketag.getters.getImgurFoundDescriptionFromBikeTagData,
    getImgurMysteryDescriptionFromBikeTagData:
      biketag.getters.getImgurMysteryDescriptionFromBikeTagData,
  },
})
</script>
<style scoped></style>
