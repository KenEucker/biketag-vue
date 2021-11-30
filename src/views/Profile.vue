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
// import Player from '@/components/Player.vue'
export default defineComponent({
  name: 'ProfileView',
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
