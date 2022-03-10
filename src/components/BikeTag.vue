<template>
  <b-row :class="`center-flx ${reverse ? 'reversed' : ''}`">
    <b-col v-show="_foundImageUrl" md="6" class="mb-3 max-w">
      <b-card class="polaroid found-tag">
        <div class="img-wrapper">
          <span class="tag-number" @click="goTagPage">#{{ _foundTagnumber }}</span>
          <expandable-image
            class="image img-fluid"
            :source="getFoundImageSrc"
            :full-source="_foundImageUrl"
            :alt="foundDescription"
            @load="tagImageLoaded('found')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <div v-if="foundDescription?.length" class="description">
            <span>{{ foundDescription }}</span>
          </div>
          <div v-else class="description">
            <span>#{{ _foundTagnumber }}</span>
            <span class="found-at">[{{ $t('components.biketag.found_at') }}]</span>
            <span>{{
              tag.foundLocation?.length ? tag.foundLocation : $t('components.biketag.unknown')
            }}</span>
          </div>
          <div class="info-wrapper">
            <span v-if="showPlayer" class="tag-player" @click="goPlayerPage(tag.foundPlayer)">{{
              tag.foundPlayer
            }}</span>
            <span v-if="showPostedDate" class="tag-date">{{ getPostedDate(tag.foundTime) }}</span>
            <span v-if="showFoundPostedDateTime" class="tag-date">{{
              getPostedDate(tag.foundTime, true)
            }}</span>
          </div>
        </div>
      </b-card>
    </b-col>
    <b-col v-show="_mysteryImageUrl" :md="_foundImageUrl ? 6 : 12" class="mb-3 max-w">
      <b-card class="polaroid mystery-tag">
        <bike-tag-button
          v-if="tagnumber"
          v-b-popover.click.left="_getHint"
          class="btn-hint btn-circle"
          text="?"
          variant="circle-clean"
        >
        </bike-tag-button>
        <div class="img-wrapper">
          <span class="tag-number" @click="goTagPage">#{{ _tagnumber }}</span>
          <expandable-image
            :source="getMysteryImageSrc"
            :full-source="_mysteryImageUrl"
            :alt="_mysteryDescription"
            @load="tagImageLoaded('mystery')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <div class="description">
            <span>{{ _mysteryDescription }}</span>
          </div>
          <div class="info-wrapper">
            <span v-if="showPlayer" class="tag-player" @click="goPlayerPage(tag.mysteryPlayer)">{{
              tag.mysteryPlayer
            }}</span>
            <span v-if="showPostedDate" class="tag-date">{{ getPostedDate(tag.mysteryTime) }}</span>
            <span v-if="showMysteryPostedDateTime" class="tag-date">{{
              getPostedDate(tag.mysteryTime, true)
            }}</span>
          </div>
        </div>
      </b-card>
    </b-col>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTag',
  components: {
    ExpandableImage,
    BikeTagButton,
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
    showHint: {
      type: Boolean,
      default: false,
    },
    showPostedDate: {
      type: Boolean,
      default: true,
    },
    showMysteryPostedDateTime: {
      type: Boolean,
      default: true,
    },
    showFoundPostedDateTime: {
      type: Boolean,
      default: true,
    },
    sizedMysteryImage: {
      type: Boolean,
      default: true,
    },
    sizedFoundImage: {
      type: Boolean,
      default: true,
    },
    useLargeSrcImages: {
      type: Boolean,
      default: false,
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
    showPlayer: {
      type: Boolean,
      default: true,
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
      noTagnumberLink: false,
    }
  },
  computed: {
    ...mapGetters(['getImgurImageSized']),
    _tagnumber() {
      return this.tagnumber ? this.tagnumber : this.tag?.tagnumber
    },
    _getHint() {
      return this.tag?.hint ? this.tag.hint : this.$t('pages.play.nohint')
    },
    _foundTagnumber() {
      return this.foundTagnumber ? this.foundTagnumber : this.tag?.tagnumber
    },
    _foundImageUrl() {
      return this.foundImageUrl
        ? this.foundImageUrl.length === 0
          ? null
          : this.foundImageUrl
        : this.tag?.foundImageUrl
    },
    _mysteryImageUrl() {
      return this.mysteryImageUrl
        ? this.mysteryImageUrl.length === 0
          ? null
          : this.mysteryImageUrl
        : this.tag?.mysteryImageUrl
    },
    getFoundImageSrc() {
      return this.useLargeSrcImages
        ? this.getImgurImageSized(this._mysteryImageUrl, 'l')
        : this.sizedFoundImage
        ? this.getImgurImageSized(this._foundImageUrl)
        : this._foundImageUrl
    },
    getMysteryImageSrc() {
      return this.useLargeSrcImages
        ? this.getImgurImageSized(this._mysteryImageUrl, 'l')
        : this.sizedMysteryImage
        ? this.getImgurImageSized(this._mysteryImageUrl, this._foundImageUrl ? 'm' : 'l')
        : this._mysteryImageUrl
    },
    _mysteryDescription() {
      return this.mysteryDescription
        ? this.mysteryDescription
        : `#${this._tagnumber} ${this.tag?.hint?.length > 0 ? `"${this.tag.hint}"` : ''}`
    },
  },
  mounted() {
    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1'
    document.head.appendChild(viewportMeta)
  },
  methods: {
    getPostedDate(timestamp, timeOnly = false) {
      if (!timestamp) {
        return ''
      }
      const datetime = timeOnly
        ? new Date(timestamp * 1000).toLocaleTimeString()
        : new Date(timestamp * 1000).toLocaleDateString()

      return `${timeOnly ? ' @ ' : this.$t('components.biketag.posted_on')} ${datetime}`
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
      if (!this.noTagnumberLink) {
        this.$router.push('/' + encodeURIComponent(this._tagnumber))
      }
    },
    goPlayerPage(player) {
      this.$router.push('/player/' + encodeURIComponent(player))
    },
  },
})
</script>
<style lang="scss">
.btn-hint {
  .biketag-text__inner {
    min-width: 6rem !important;
    font-size: 3.5rem !important;
  }
}
</style>
<style lang="scss" scoped>
.reversed {
  flex-flow: row-reverse wrap;
}

.info-wrapper {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-flow: row wrap;
  padding: 0 1rem;

  .tag-player {
    cursor: pointer;
    animation: fadein 2s;
    text-align: center;
    width: 100%;
    transform: rotate(-6deg);
  }
}

.max-w {
  max-width: 800px;
}

.center-flx {
  justify-content: center;
}

.polaroid {
  background-color: white;
  box-shadow: 0 4px 8px 0 rgb(0 0 0 / 20%), 0 6px 20px 0 rgb(0 0 0 / 19%);
  margin-bottom: 25px;
  width: 100%;
}

.img-wrapper {
  position: relative;
}

.tag-number {
  position: absolute;
  top: -1em;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  padding: 0 1.5rem;
}

.card-bottom {
  .description {
    position: relative;
    white-space: break-spaces;
    padding: 0.5rem;
    line-height: 2em;
    text-transform: uppercase;

    .found-at {
      text-transform: initial;
    }
  }
}

.btn-hint {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 99;
  background-size: unset;
  background-color: transparent;
  min-height: unset;
}
</style>
