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
        <bike-tag
          :key="tag.tagnumber"
          :tag="tag"
          :found-tagnumber="tag.tagnumber - 1"
          :found-description="getSelfTagFoundDescription(tag)"
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
  name: 'PlayerView',
  components: {
    BikeTag,
  },
  data() {
    return {
      currentPage: 1,
      perPage: 5,
      options: [
        { value: 5, text: '5' },
        { value: 10, text: '10' },
        { value: 15, text: '15' },
        { value: 20, text: '20' },
        { value: 25, text: '25' },
      ],
    }
  },
  computed: {
    // mix the getters into computed with object spread operator
    ...mapGetters(['getPlayers']),
    player() {
      const playerName = decodeURIComponent(encodeURIComponent(this.$route.params.name))
      const playerList = this.getPlayers.filter((player) => {
        return decodeURIComponent(encodeURIComponent(player.name)) == playerName
      })
      return playerList[0]
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
  mounted() {
    this.$store.dispatch('setPlayers')
  },
  methods: {
    resetCurrentPage() {
      this.currentPage = 0
    },
    getSelfTagFoundDescription(tag) {
      return biketag.getters.getImgurFoundDescriptionFromBikeTagData({
        ...tag,
        ...{ tagnumber: tag.tagnumber - 1 },
      })
    },
  },
})
</script>
