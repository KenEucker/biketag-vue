<template>
  <b-row>
    <b-col :md="!!_foundImageUrl ? 6 : 12" class="mb-3">
      <b-card>
        <div class="img-wrapper">
          <span class="tag-number">#{{ _tagnumber }}</span>
          <span class="tag-player">{{ _mysteryPlayer }}</span>
          <expandable-image :src="_mysteryImageUrl" :alt="_mysteryDescription"></expandable-image>
        </div>
        <span class="desc">{{ _mysteryDescription }}</span>
      </b-card>
    </b-col>
    <b-col v-show="!!_foundImageUrl" md="6" class="mb-3">
      <b-card>
        <div class="img-wrapper">
          <span class="tag-number">#{{ _foundTagnumber }}</span>
          <span class="tag-player">{{ _foundPlayer }}</span>
          <expandable-image
            class="image img-fluid"
            :src="_foundImageUrl"
            :alt="foundDescription"
          ></expandable-image>
        </div>
        <span class="desc">{{ _foundDescription }}</span>
      </b-card>
    </b-col>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import biketag from 'biketag'

export default defineComponent({
  name: 'BikeTag',
  components: {
    ExpandableImage,
  },
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
    tagnumber: {
      type: Number,
      default: 0,
    },
    foundTagnumber: {
      type: Number,
      default: 0,
    },
    foundImageUrl: {
      type: String,
      default: null,
    },
    mysteryImageUrl: {
      type: String,
      default: null,
    },
    foundPlayer: {
      type: String,
      default: null,
    },
    mysteryPlayer: {
      type: String,
      default: null,
    },
    foundDescription: {
      type: String,
      default: null,
    },
    mysteryDescription: {
      type: String,
      default: null,
    },
  },
  computed: {
    _tagnumber() {
      return this.tagnumber ? this.tagnumber : this.tag?.tagnumber
    },
    _foundTagnumber() {
      return this.foundTagnumber ? this.foundTagnumber : this.tag?.tagnumber
    },
    _foundImageUrl() {
      return this.foundImageUrl ? this.foundImageUrl : this.tag?.foundImageUrl
    },
    _mysteryImageUrl() {
      return this.mysteryImageUrl ? this.mysteryImageUrl : this.tag?.mysteryImageUrl
    },
    _foundPlayer() {
      return this.foundPlayer ? this.foundPlayer : this.tag?.foundPlayer
    },
    _mysteryPlayer() {
      return this.mysteryPlayer ? this.mysteryPlayer : this.tag?.mysteryPlayer
    },
    _foundDescription() {
      return this.foundDescription
        ? this.foundDescription
        : this.getImgurFoundDescriptionFromBikeTagData(this.tag ?? '')
    },
    _mysteryDescription() {
      return this.mysteryDescription
        ? this.mysteryDescription
        : this.getImgurMysteryDescriptionFromBikeTagData(this.tag ?? '')
    },
  },
  mounted() {
    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1'
    document.head.appendChild(viewportMeta)
  },
  methods: {
    getImgurFoundDescriptionFromBikeTagData:
      biketag.getters.getImgurFoundDescriptionFromBikeTagData,
    getImgurMysteryDescriptionFromBikeTagData:
      biketag.getters.getImgurMysteryDescriptionFromBikeTagData,
  },
})
</script>
<style scoped lang="scss">
.img-wrapper {
  position: relative;

  .tag-number {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 99;
    padding: 0 0.5rem;
    text-shadow: 2px 2px #292828e6;

    /* border-radius: 10px; */
  }

  .tag-player {
    position: absolute;
    right: 1rem;
    bottom: 0;
    z-index: 99;
    text-shadow: 2px 2px #292828e6;
  }

  .desc {
    position: relative;
    font-size: 3vh;
  }
}
</style>
