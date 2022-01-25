<template>
  <b-row :class="reverse ? 'reversed' : ''">
    <b-col v-show="_mysteryImageUrl" :md="_foundImageUrl ? 6 : 12" class="mb-3">
      <b-card class="polaroid mystery-tag">
        <div class="img-wrapper">
          <span class="tag-number" @click="goTagPage">#{{ _tagnumber }}</span>
          <expandable-image
            :source="getImgurImageSized(_mysteryImageUrl, _foundImageUrl ? 'm' : 'l')"
            :full-source="_mysteryImageUrl"
            :alt="_mysteryDescription"
            @load="tagImageLoaded('mystery')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <div class="description">
            <span>{{ _mysteryDescription }}</span>
            <br />
            <span>{{ getMysteryPostedDate() }}</span>
          </div>
          <player v-if="mysteryPlayer" :player="mysteryPlayer" size="txt" />
          <span v-else class="player-name">{{ _mysteryPlayer }}</span>
        </div>
      </b-card>
    </b-col>
    <b-col v-show="_foundImageUrl" md="6" class="mb-3">
      <b-card class="polaroid found-tag">
        <div class="img-wrapper">
          <span class="tag-number">#{{ _foundTagnumber }}</span>
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
          <player class="tag-player" :player="foundPlayer" :player-name="_foundPlayer" size="txt" />
        </div>
      </b-card>
    </b-col>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import Player from '@/components/PlayerBicon.vue'
import { mapGetters } from 'vuex'

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
      noTagnumberLink: false,
    }
  },
  computed: {
    ...mapGetters(['getImgurImageSized']),
    _tagnumber() {
      return this.tagnumber ? this.tagnumber : this.tag?.tagnumber
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
    _foundPlayer() {
      return this.tag?.foundPlayer ?? ''
    },
    _mysteryPlayer() {
      return this.tag?.mysteryPlayer ?? ''
    },
    _foundDescription() {
      return this.foundDescription ? this.foundDescription : this.getFoundDescription()
    },
    _mysteryDescription() {
      return this.mysteryDescription ? this.mysteryDescription : this.getMysteryDescription()
    },
  },
  mounted() {
    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1'
    document.head.appendChild(viewportMeta)
  },
  methods: {
    getFoundDescription() {
      return `#${this._foundTagnumber} (found at) ${this.tag.foundLocation ?? 'unknown'}`
    },
    getMysteryDescription() {
      return `#${this._tagnumber} ${this.tag?.hint?.length > 0 ? `"${this.tag.hint}"` : ''}`
    },
    getMysteryPostedDate() {
      return this.tag?.foundTime
        ? `[${this.$t('components.biketag.posted_on')} ${new Date(
            this.tag.foundTime * 1000
          ).toLocaleDateString()}]`
        : ''
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
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 1.5rem;
  }

  .tag-player {
    position: absolute;
    right: 5rem;
    bottom: 0;
    z-index: 99;
  }
}

.card-bottom {
  min-height: 12rem;

  .description {
    position: relative;
    white-space: pre-wrap;
    width: 110%;
    margin-left: -5%;
    padding: 1em;
    line-height: 2em;
  }
}
</style>
