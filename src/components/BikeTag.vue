<template>
  <b-row :class="reverse ? 'reversed' : ''">
    <b-col :md="_foundImageUrl ? 6 : 12" class="mb-3">
      <b-card class="polaroid">
        <div class="img-wrapper">
          <span class="tag-number">#{{ _tagnumber }}</span>
          <player v-if="mysteryPlayer" class="tag-player" :player="mysteryPlayer" size="txt" />
          <span v-else class="tag-player">{{ _mysteryPlayer }}</span>
          <expandable-image
            :source="getImgurImageSized(_mysteryImageUrl, _foundImageUrl ? 'm' : 'l')"
            :full-source="_mysteryImageUrl"
            :alt="_mysteryDescription"
            @load="tagImageLoaded('mystery')"
          ></expandable-image>
        </div>
        <div class="card-bottom" @click="goTagPage">
          <span class="description">{{ _mysteryDescription }}</span>
        </div>
      </b-card>
    </b-col>
    <b-col v-show="_foundImageUrl" md="6" class="mb-3">
      <b-card class="polaroid">
        <div class="img-wrapper">
          <span class="tag-number">#{{ _foundTagnumber }}</span>
          <player v-if="foundPlayer" class="tag-player" :player="foundPlayer" size="txt" />
          <span v-else class="tag-player">{{ _foundPlayer }}</span>
          <expandable-image
            class="image img-fluid"
            :source="getImgurImageSized(_foundImageUrl)"
            :full-source="_foundImageUrl"
            :alt="foundDescription"
            @load="tagImageLoaded('found')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <span class="description">{{ _foundDescription }}</span>
        </div>
      </b-card>
    </b-col>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import Player from '@/components/PlayerBicon.vue'

export default defineComponent({
  name: 'BikeTag',
  components: {
    ExpandableImage,
    Player,
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
      type: Object,
      default: null,
    },
    mysteryPlayer: {
      type: Object,
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
    reverse: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['load'],
  data() {
    return {
      mysteryImageLoaded: false,
      foundImageLoaded: false,
      noLink: false,
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
      return this.tag?.foundPlayer ?? ''
    },
    _mysteryPlayer() {
      return this.tag?.mysteryPlayer ?? ''
    },
    _foundDescription() {
      return this.foundDescription
        ? this.foundDescription
        : this.getFoundDescription(this.tag ?? {})
    },
    _mysteryDescription() {
      return this.mysteryDescription
        ? this.mysteryDescription
        : this.getMysteryDescription(this.tag ?? {})
    },
  },
  mounted() {
    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1'
    document.head.appendChild(viewportMeta)
  },
  methods: {
    getFoundDescription: (tag) => `#${tag.tagnumber} (found at) ${tag.foundLocation ?? 'unknown'}`,
    getMysteryDescription: (tag) =>
      `#${tag.tagnumber} (posted on) ${new Date(tag.foundTime * 1000).toLocaleDateString()}`,
    getImgurImageSized(imgurUrl = '') {
      return imgurUrl
        .replace('.jpg', `${this.size}.jpg`)
        .replace('.gif', `${this.size}.gif`)
        .replace('.png', `${this.size}.png`)
        .replace('.mp4', `${this.size}.mp4`)
    },
    tagImageLoaded(type) {
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
    goTagPage: function () {
      console.log('hi')
      if (!this.noLink) {
        this.$router.push('/' + encodeURIComponent(this._tagnumber))
      }
    },
  },
})
</script>
<style scoped lang="scss">
.reversed {
  flex-flow: row-reverse;
}

.polaroid {
  background-color: white;
  box-shadow: 0 4px 8px 0 rgb(0 0 0 / 20%), 0 6px 20px 0 rgb(0 0 0 / 19%);
  margin-bottom: 25px;
}

.img-wrapper {
  position: relative;

  .tag-number {
    position: absolute;
    top: -1em;
    transform: rotate(3deg);
    left: 30%;
    z-index: 99;
    padding: 0 1.5rem;
  }

  .tag-player {
    position: absolute;
    right: 5rem;
    bottom: 0;
    z-index: 99;
    text-shadow: 2px 2px #292828e6;
  }
}

.card-bottom {
  padding: 2em;

  .description {
    position: relative;
    font-size: 3vh;
  }
}
</style>
