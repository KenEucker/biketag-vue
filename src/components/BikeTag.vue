<template>
  <b-row>
    <b-col :md="!!_foundImageUrl ? 6 : 12" class="mb-3">
      <b-card>
        <div class="img-wrapper">
          <span class="tag-number">#{{ _tagnumber }}</span>
          <span class="tag-player">{{ _mysteryPlayer }}</span>
          <expandable-image
            :src="getImgurImageSized(_mysteryImageUrl)"
            :full-source="_mysteryImageUrl"
            :alt="_mysteryDescription"
            @load="tagImageLoaded('mystery')"
          ></expandable-image>
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
            :src="getImgurImageSized(_foundImageUrl)"
            :full-source="_foundImageUrl"
            :alt="foundDescription"
            @load="tagImageLoaded('found')"
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
    size: {
      type: String,
      default: 'm',
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
  emits: ['load'],
  data() {
    return {
      mysteryImageLoaded: false,
      foundImageLoaded: false,
    }
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
    getImgurImageSized(imgurUrl = '') {
      return imgurUrl
        .replace('.jpg', `${this.size}.jpg`)
        .replace('.gif', `${this.size}.gif`)
        .replace('.png', `${this.size}.png`)
        .replace('.mp4', `${this.size}.mp4`)
    },
    tagImageLoaded(type) {
      console.log({ type })
      if (type === 'mystery') {
        this.mysteryImageLoaded = true
      } else if (type === 'found') {
        this._foundImageLoaded = true
      }

      if (
        this.mysteryImageLoaded &&
        (!!this._foundImageUrl || this.foundImageLoaded || !this._foundImageUrl)
      ) {
        this.$emit('load')
      }
    },
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
