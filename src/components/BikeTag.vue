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
            :alt="props.foundDescription"
            @loaded="tagImageLoaded('found')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <div v-if="props.foundDescription?.length" class="description">
            <span v-dynamic-font="dynamicFontSettings">{{ props.foundDescription }}</span>
          </div>
          <div v-else class="description">
            <span v-dynamic-font="dynamicFontSettings">#{{ _foundTagnumber }}</span>
            <span v-dynamic-font="dynamicFontSettings" class="found-at"
              >[{{ t('components.biketag.found_at') }}]</span
            >
            <span v-dynamic-font="dynamicFontSettings">
              {{
                props.tag.foundLocation?.length
                  ? props.tag.foundLocation
                  : $t('components.biketag.unknown')
              }}
            </span>
          </div>
          <div class="info-wrapper">
            <span
              v-if="props.showPlayer"
              class="tag-player"
              @click="goPlayerPage(props.tag.foundPlayer)"
            >
              {{ props.tag.foundPlayer }}
            </span>
            <span
              v-if="showInBoundary"
              :class="`${props.tag.inBoundary ? 'tag-inBoundary' : 'tag-outBoundary'}`"
            >
              {{ tagInBoundary }}
            </span>
            <span v-if="props.showPostedDate" class="tag-date">
              {{ getPostedDate(props.tag.foundTime) }}
            </span>
            <span v-if="props.showFoundPostedDateTime" class="tag-date">{{
              getPostedDate(props.tag.foundTime, true)
            }}</span>
          </div>
        </div>
      </b-card>
    </b-col>
    <b-col v-show="_mysteryImageUrl" :md="_foundImageUrl ? 6 : 12" class="mb-3 max-w">
      <b-card class="polaroid mystery-tag">
        <bike-tag-button
          v-if="props.tagnumber"
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
            @loaded="tagImageLoaded('mystery')"
          ></expandable-image>
        </div>
        <div class="card-bottom">
          <div class="description">
            <span v-dynamic-font="dynamicFontSettings">{{ _mysteryDescription }}</span>
          </div>
          <div class="info-wrapper">
            <span
              v-if="props.showPlayer"
              class="tag-player"
              @click="goPlayerPage(props.tag.mysteryPlayer)"
            >
              {{ props.tag.mysteryPlayer }}
            </span>
            <span v-if="props.showPostedDate" class="tag-date">
              {{ getPostedDate(props.tag.mysteryTime) }}
            </span>
            <span v-if="props.showMysteryPostedDateTime" class="tag-date">
              {{ getPostedDate(props.tag.mysteryTime, true) }}
            </span>
          </div>
        </div>
      </b-card>
    </b-col>
  </b-row>
</template>

<script setup name="BikeTag">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index'
import { getTagDate } from '@/common/utils'
import { useI18n } from 'vue-i18n'

// componets
import ExpandableImage from '@/components/ExpandableImage.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

// props
const props = defineProps({
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
  imageSize: {
    type: String,
    default: null,
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
  showInBoundary: {
    type: Boolean,
    default: false,
  },
})

// data
const emit = defineEmits(['load'])
const mysteryImageLoaded = ref(false)
const foundImageLoaded = ref(false)
const noTagnumberLink = ref(false)
const store = useStore()
const router = useRouter()
const { t } = useI18n()
const dynamicFontSettings = { min: 20, max: 28 }

// computed
const getImgurImageSized = computed(() => store.getImgurImageSized)
const _tagnumber = computed(() => (props.tagnumber ? props.tagnumber : props.tag?.tagnumber))
const _getHint = computed(() => (props.tag?.hint ? props.tag.hint : t('pages.play.nohint')))
const _foundTagnumber = computed(() =>
  props.foundTagnumber ? props.foundTagnumber : props.tag?.tagnumber,
)
const _foundImageUrl = computed(() => {
  return props.foundImageUrl
    ? props.foundImageUrl.length === 0
      ? null
      : props.foundImageUrl
    : props.tag?.foundImageUrl
})
const _mysteryImageUrl = computed(() => {
  return props.mysteryImageUrl
    ? props.mysteryImageUrl.length === 0
      ? null
      : props.mysteryImageUrl
    : props.tag?.mysteryImageUrl
})
const getFoundImageSrc = computed(() => {
  return props.imageSize
    ? getImgurImageSized.value(_foundImageUrl.value, props.imageSize)
    : props.sizedFoundImage
      ? getImgurImageSized.value(_foundImageUrl.value)
      : _foundImageUrl.value
})
const getMysteryImageSrc = computed(() => {
  return props.imageSize
    ? getImgurImageSized.value(_mysteryImageUrl.value, props.imageSize)
    : props.sizedMysteryImage
      ? getImgurImageSized.value(_mysteryImageUrl.value, _foundImageUrl.value ? 'm' : 'l')
      : _mysteryImageUrl.value
})
const _mysteryDescription = computed(() => {
  return props.mysteryDescription
    ? props.mysteryDescription
    : `#${_tagnumber.value} ${props.tag?.hint?.length > 0 ? `"${props.tag.hint}"` : ''}`
})
const tagInBoundary = computed(() => {
  if (props.tag.inBoundary === undefined) {
    return ''
  } else if (!props.tag.inBoundary) {
    return 'Outside boundaries'
  }

  return 'Inside boudaries'
})

// methods
const getPostedDate = (timestamp, timeOnly = false) => {
  if (!timestamp) {
    return ''
  }

  const date = getTagDate(timestamp)
  const datetime = timeOnly ? date.toLocaleTimeString() : date.toLocaleDateString()

  return `${timeOnly ? ' @ ' : t('components.biketag.posted_on')} ${datetime}`
}
const tagImageLoaded = (type) => {
  if (type === 'mystery') {
    mysteryImageLoaded.value = true
  } else if (type === 'found') {
    foundImageLoaded.value = true
  }

  if (
    mysteryImageLoaded.value &&
    (!!_foundImageUrl.value || foundImageLoaded.value || !_foundImageUrl.value)
  ) {
    emit('load')
  }
}
const goTagPage = () => {
  if (!noTagnumberLink.value) {
    router.push('/' + encodeURIComponent(_tagnumber.value))
  }
}
const goPlayerPage = (player) => {
  router.push('/player/' + encodeURIComponent(player))
}

// mounted
onMounted(() => {
  const viewportMeta = document.createElement('meta')
  viewportMeta.name = 'viewport'
  viewportMeta.content = 'width=device-width, initial-scale=1'
  document.head.appendChild(viewportMeta)
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
.tag-inBoundary {
  color: green;
}

.tag-outBoundary {
  color: red;
}

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
  box-shadow:
    0 4px 8px 0 rgb(0 0 0 / 20%),
    0 6px 20px 0 rgb(0 0 0 / 19%);
  margin-bottom: 25px;
  width: 100%;
}

.img-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.tag-number {
  position: absolute;
  top: -0.75em;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  padding: 0 1.5rem;
  cursor: pointer;
}

.card-bottom {
  margin-top: auto;

  .description {
    position: relative;
    white-space: break-spaces;
    padding: 0.5rem;
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
