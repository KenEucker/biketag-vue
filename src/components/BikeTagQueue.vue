<template>
  <div v-if="props.tag" :class="`bike-pagination container ${props.size}`">
    <div class="bike-pagination-bullet">
      <span v-if="showNumber"> {{ props.tag.tagnumber }} by {{ props.tag.mysteryPlayer }} </span>
      <v-lazy-image :src="getImageSized(props.tag.mysteryImageUrl, props.size)" />
      <v-lazy-image :src="getImageSized(props.tag.foundImageUrl, props.size)" />
    </div>
  </div>
  <div v-else-if="getCurrentBikeTag" class="container">
    <div v-if="props.onlyMine">
      <b-button id="current-mystery-popover" class="navigation">
        <v-lazy-image
          class="img-fluid"
          :src="getImageSized(getCurrentBikeTag.mysteryImageUrl, 's')"
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
        <v-lazy-image class="img-fluid" :src="getImageSized(getPlayerTag.foundImageUrl, 's')" />
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
        <v-lazy-image class="img-fluid" :src="getImageSized(getPlayerTag.mysteryImageUrl, 's')" />
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
          :src="getImageSized(getQueuedTags[index - 1]?.foundImageUrl)"
          @click="paginationClick(index - 1)"
        />
        <span v-if="showNumber">{{ index }}</span>
      </div>
    </div>
  </div>
</template>

<script setup name="BikeTagQueue">
import VLazyImage from 'v-lazy-image'
import { computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { BiketagQueueFormSteps } from '../common/types'
import { useBikeTagStore } from '../store/index'

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
const { t } = useI18n()
const emit = defineEmits(['dequeing', 'dequeue-success', 'dequeue-error'])

// computed
const getQueuedTags = computed(() => store.getQueuedTags)
const showLimit = computed(() => (props.limit ? props.limit : store.getQueuedTags?.length))
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerTag = computed(() => store.getPlayerTag)
const getImageSized = computed(() => store.getImageSized)
const getQueuedTagState = computed(() => store.getQueuedTagState)
const showNumber = computed(() => (props.size !== 's' ? props.showNumber : false))

// methods
function canReset() {
  return getQueuedTagState.value !== BiketagQueueFormSteps.roundPosted
}
async function resetToFound() {
  // await store.fetchCredentials()

  console.log('dequeing')
  emit('dequeing')
  return store.dequeueFoundTag().then((dequeueSuccessful) => {
    if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
      /// TODO: this notification needs to be removed before publishing v3.0.0
      console.log('dequeue-success')
      emit('dequeue-success')
      return emit('dequeue-error', dequeueSuccessful)
    } else {
      nextTick(() => {
        router.go()
      })
    }
  })
}
async function resetToMystery() {
  // await store.fetchCredentials()
  console.log('dequeing')
  emit('dequeing')
  return store.dequeueMysteryTag().then((dequeueSuccessful) => {
    if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
      console.log('dequeue-success')
      emit('dequeue-success')
      return emit('dequeue-error', dequeueSuccessful)
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