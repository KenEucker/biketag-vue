<template>
  <div v-if="props.tag" class="container">
    <div class="bike-pagination-bullet">
      <span v-if="props.showNumber">
        {{ props.tag.tagnumber }} by {{ props.tag.mysteryPlayer }}
      </span>
      <v-lazy-image :src="getImgurImageSized(props.tag.mysteryImageUrl, 's')" />
      <v-lazy-image :src="getImgurImageSized(props.tag.foundImageUrl, 's')" />
    </div>
  </div>
  <div v-else-if="getCurrentBikeTag" class="container">
    <div v-if="props.onlyMine">
      <b-button id="current-mystery-popover" class="navigation">
        <v-lazy-image class="img-fluid" :src="getImgurImageSized(getCurrentBikeTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover
        target="current-mystery-popover"
        class="current-mystery"
        triggers="hover focus"
        placement="bottom"
      >
        <template #title>{{ t('components.queue.current_mystery_location') }}</template>
        <v-lazy-image class="img-fluid" :src="getCurrentBikeTag.mysteryImageUrl" />
      </b-popover>

      <b-button v-if="getPlayerTag.foundImageUrl" id="queued-found-popover" class="navigation">
        <v-lazy-image class="img-fluid" :src="getImgurImageSized(getPlayerTag.foundImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getPlayerTag.foundImageUrl?.length > 0"
        target="queued-found-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-found"
      >
        <template #title>{{ t('components.queue.view_found_image') }}</template>
        <v-lazy-image class="img-fluid" :src="getPlayerTag.foundImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToFound">
            {{ t('components.queue.reset_queue_button') }}
          </b-button>
        </div>
      </b-popover>

      <b-button
        v-if="getPlayerTag.mysteryImageUrl?.length > 0"
        id="queued-mystery-popover"
        class="navigation"
      >
        <v-lazy-image class="img-fluid" :src="getImgurImageSized(getPlayerTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getPlayerTag.mysteryImageUrl?.length > 0"
        target="queued-mystery-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-mystery"
      >
        <template #title>{{ t('components.queue.view_mystery_image') }}</template>
        <v-lazy-image class="img-fluid" :src="getPlayerTag.mysteryImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToMystery">
            {{ t('components.queue.reset_queue_button') }}
          </b-button>
        </div>
      </b-popover>
    </div>
    <div v-if="!props.onlyMine" class="bike-pagination mt-3 mb-3">
      <div v-for="(tag, index) in getQueuedTags" :key="index" class="bike-pagination-bullet">
        <v-lazy-image :src="getImgurImageSized(tag.foundImageUrl)" @click="paginationClick(index)" />
        <span v-if="props.showNumber">{{ index + 1 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup name="BikeTagQueue">
import { inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index.ts'
import { BiketagFormSteps } from '@/common/types'
import { useI18n } from 'vue-i18n'
import VLazyImage from "v-lazy-image"

// props
const props = defineProps({
  tag: {
    type: Object,
    default: null,
  },
  onlyMine: {
    type: Boolean,
    default: false,
  },
  showNumber: {
    type: Boolean,
    default: true,
  },
  paginationRef: {
    type: Object,
    default: null,
  },
})

// data
const store = useStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getQueuedTags = computed(() => store.getQueuedTags)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerTag = computed(() => store.getPlayerTag)
const getImgurImageSized = computed(() => store.getImgurImageSized)
const getQueuedTagState = computed(() => store.getQueuedTagState)

// methods
function canReset() {
  return getQueuedTagState.value !== BiketagFormSteps.roundPosted
}
async function resetToFound() {
  await store.fetchCredentials()
  return store.dequeueFoundTag().then((dequeueSuccessful) => {
    if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
      return toast.open({
        message: `dequeue tag error: ${dequeueSuccessful}`,
        type: 'error',
        timeout: false,
        position: 'bottom',
      })
    } else {
      nextTick(() => {
        router.go()
      })
    }
  })
}
async function resetToMystery() {
  await store.fetchCredentials()
  return store.dequeueMysteryTag().then((dequeueSuccessful) => {
    if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
      return toast.open({
        message: `dequeue tag error: ${dequeueSuccessful}`,
        type: 'error',
        timeout: false,
        position: 'bottom',
      })
    } else {
      nextTick(() => {
        router.go()
      })
    }
  })
}
function paginationClick(key) {
  if (props.paginationRef) {
    props.paginationRef.slideTo(key)
  }
}
</script>

<style lang="scss" scoped>
.navigation {
  width: 5rem;
  height: 5rem;
  margin: 10px;
  padding: 0;
  cursor: pointer;
  border: 0;
  border-radius: 5rem;

  img {
    background-color: white;
    width: 5rem;
    height: 5rem;
    border-radius: 5rem;
  }

  @media (min-width: 500px) {
    width: 8rem;
    height: 8rem;

    img {
      width: 8rem;
      height: 8rem;
    }
  }
}

.bike-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;

  /* border: 1px solid red; */
  color: #000;

  i {
    margin-right: 20px;
    font-size: 25px;
  }
}

// .current-mystery,
// .queued-found,
// .queued-mystery {
// }

.bike-pagination-bullet {
  position: relative;

  img {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 5rem;
    height: 5rem;
    margin: 5px;
    border-radius: 5rem;
    cursor: pointer;
  }

  span {
    position: absolute;
    top: 75%;
    left: 25%;
    right: 25%;
    font-size: 2rem;
    color: white;
  }
}
</style>
