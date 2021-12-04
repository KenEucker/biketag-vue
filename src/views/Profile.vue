<template>
  <b-spinner v-show="loading" />
  <div v-show="!loading" class="container">
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
  name: 'ProfileView',
  components: {
    BikeTag,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 10,
      loading: true,
    }
  },
  computed: {
    // mix the getters into computed with object spread operator
    ...mapGetters(['getAllPlayers']),
    player() {
      return this.getAllPlayers.filter(
        (player) => decodeURIComponent(player.name) == this.$route.params.name
      )[0]
    },
    tagsForList() {
      return this.player.tags.slice(
        (this.currentPage - 1) * this.perPage,
        this.currentPage * this.perPage
      )
    },
    totalCount() {
      return this.player.tags.length
    },
  },
  mounted() {
    this.loading = false
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
