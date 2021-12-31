<template>
  <b-row :class="reverse ? 'reversed' : ''">
    <div v-masonry-tile md="6" class="item mb-3">
      <b-card class="polaroid">
        <div class="img-wrapper">
          <span class="tag-order">{{ tagOrder }}</span>
          <expandable-image
            class="image img-fluid"
            :source="getImgurImageSized(_imageUrl)"
            :full-source="_imageUrl"
            :alt="foundDescription"
            @load="tagImageLoaded('found')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <span class="description">{{ _description }}</span>
        </div>
      </b-card>
    </div>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueuedTag',
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
    tagOrder: {
      type: Number,
      default: 1,
    },
    foundImageUrl: {
      type: String,
      default: null,
    },
    foundPlayer: {
      type: String,
      default: null,
    },
    foundDescription: {
      type: String,
      default: null,
    },
  },
  emits: ['load'],
  data() {
    return {
      foundImageLoaded: false,
      noLink: false,
    }
  },
  computed: {
    ...mapGetters(['getImgurImageSized']),
    _tagnumber() {
      return this.tagnumber ? this.tagnumber : this.tag?.tagnumber
    },
    _imageUrl() {
      return this.foundImageUrl ? this.foundImageUrl : this.tag?.foundImageUrl
    },
    _foundPlayer() {
      return this.tag?.foundPlayer ?? ''
    },
    _description() {
      return 'Queued by ' + this.foundPlayer
    },
  },
  methods: {
    getFoundDescription: (tag) => `#${tag.tagnumber} (found at) ${tag.foundLocation ?? 'unknown'}`,
    tagImageLoaded(type) {
      if (type === 'mystery') {
        this.mysteryImageLoaded = true
      } else if (type === 'found') {
        this._foundImageLoaded = true
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
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 1.5rem;
  }

  .tag-order {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 99;
    text-shadow: 2px 2px #292828e6;
    font-size: 5vh;
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
