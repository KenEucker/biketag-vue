<template>
  <div v-if="props.tag" :class="`bike-pagination container ${props.size}`">
    <div class="bike-pagination-bullet">
      <span v-if="showNumber"> {{ props.tag.tagnumber }} by {{ props.tag.mysteryPlayer }} </span>
      <v-lazy-image :src="getImgurImageSized(props.tag.mysteryImageUrl, props.size)" />
      <v-lazy-image :src="getImgurImageSized(props.tag.foundImageUrl, props.size)" />
    </div>
  </div>
  <div v-else-if="getCurrentBikeTag" class="container">
    <div v-if="props.onlyMine">
      <b-button id="current-mystery-popover" class="navigation">
        <v-lazy-image
          class="img-fluid"
          :src="getImgurImageSized(getCurrentBikeTag.mysteryImageUrl, 's')"
        />
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
        <v-lazy-image
          class="img-fluid"
          :src="getImgurImageSized(getPlayerTag.foundImageUrl, 's')"
        />
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
        <v-lazy-image
          class="img-fluid"
          :src="getImgurImageSized(getPlayerTag.mysteryImageUrl, 's')"
        />
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
    <div v-if="!props.onlyMine" :class="`bike-pagination ${props.size}`">
      <div v-for="index in showLimit" :key="index" class="bike-pagination-bullet">
        <v-lazy-image
          :src="getImgurImageSized(getQueuedTags[index - 1]?.foundImageUrl)"
          @click="paginationClick(index - 1)"
        />
        <span v-if="showNumber">{{ index }}</span>
      </div>
    </div>
  </div>
</template>

<script setup name="BikeTagQueue">
import { inject, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '../store/index'
import { BiketagFormSteps } from '../common/types'
import { useI18n } from 'vue-i18n'
import VLazyImage from 'v-lazy-image'

// props
const props = defineProps({
  size: {
    type: String,
    default: 's',
  },
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
  limit: {
    type: Number,
    default: 0,
  },
  paginationRef: {
    type: Object,
    default: null,
  },
})

// data
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getQueuedTags = computed(() => store.getQueuedTags)
const showLimit = computed(() => (props.limit ? props.limit : store.getQueuedTags?.length))
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerTag = computed(() => store.getPlayerTag)
const getImgurImageSized = computed(() => store.getImgurImageSized)
const getQueuedTagState = computed(() => store.getQueuedTagState)
const showNumber = computed(() => (props.size !== 's' ? props.showNumber : false))

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
        duration: 10000,
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
        duration: 10000,
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
.queued-tags {
  &.s {
    max-height: 30px;
  }

  &.m {
    max-height: 40px;
  }

  &.l {
    max-height: 60px;
  }
}

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

  @media (width >= 500px) {
    width: 8rem;
    height: 8rem;

    img {
      width: 8rem;
      height: 8rem;
    }
  }
}

// .current-mystery,
// .queued-found,
// .queued-mystery {
// }

.bike-pagination-bullet {
  position: relative;

  span {
    position: absolute;
    top: 75%;
    left: 25%;
    right: 25%;
    font-size: 2rem;
    color: white;
  }

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

  &.m {
    margin-top: 10px;
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  &.s {
    img {
      width: 3rem;
      height: 3rem;
    }
  }
}
</style>
