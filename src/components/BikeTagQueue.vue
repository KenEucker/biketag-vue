<template>
  <div v-if="getCurrentBikeTag" class="container">
    <div v-if="onlyMine">
      <b-button id="current-mystery-popover" class="navigation">
        <img class="img-fluid" :src="getImgurImageSized(getCurrentBikeTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover
        target="current-mystery-popover"
        class="current-mystery"
        triggers="hover focus"
        placement="bottom"
      >
        <template #title>{{ $t('components.queue.current_mystery_location') }}</template>
        <img class="img-fluid" :src="getCurrentBikeTag.mysteryImageUrl" />
      </b-popover>

      <b-button v-if="getQueuedTag.foundImageUrl" id="queued-found-popover" class="navigation">
        <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.foundImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getQueuedTag.foundImageUrl?.length > 0"
        target="queued-found-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-found"
      >
        <template #title>{{ $t('components.queue.view_found_image') }}</template>
        <img class="img-fluid" :src="getQueuedTag.foundImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToFound">{{
            $t('components.queue.reset_queue_button')
          }}</b-button>
        </div>
      </b-popover>

      <b-button
        v-if="getQueuedTag.mysteryImageUrl?.length > 0"
        id="queued-mystery-popover"
        class="navigation"
      >
        <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getQueuedTag.mysteryImageUrl?.length > 0"
        target="queued-mystery-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-mystery"
      >
        <template #title>{{ $t('components.queue.view_mystery_image') }}</template>
        <img class="img-fluid" :src="getQueuedTag.mysteryImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToMystery">{{
            $t('components.queue.reset_queue_button')
          }}</b-button>
        </div>
      </b-popover>
    </div>
    <div v-if="!onlyMine" class="bike-pagination mt-3 mb-3">
      <div v-for="(tag, index) in getQueuedTags" :key="index" class="bike-pagination-bullet">
        <img :src="tag.foundImageUrl" @click="paginationClick(index)" />
        <span v-if="showNumber">{{ index + 1 }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/common/types'

export default defineComponent({
  name: 'BikeTagQueue',
  props: {
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
  },
  computed: {
    ...mapGetters([
      'getQueuedTags',
      'getCurrentBikeTag',
      'getQueuedTag',
      'getImgurImageSized',
      'getQueuedTagState',
    ]),
  },
  methods: {
    canReset() {
      return this.getQueuedTagState !== BiketagFormSteps.queuePosted
    },
    resetToFound() {
      return this.$store.dispatch('dequeueFoundTag').then((dequeueSuccessful) => {
        if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
          return this.$toast.open({
            message: `dequeue tag error: ${dequeueSuccessful}`,
            type: 'error',
            timeout: false,
            position: 'bottom',
          })
        }
      })
    },
    resetToMystery() {
      return this.$store.dispatch('dequeueMysteryTag').then((dequeueSuccessful) => {
        if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
          return this.$toast.open({
            message: `dequeue tag error: ${dequeueSuccessful}`,
            type: 'error',
            timeout: false,
            position: 'bottom',
          })
        }
      })
    },
    paginationClick(key) {
      if (this.paginationRef) {
        this.paginationRef.slideTo(key)
      }
    },
  },
})
</script>
<style lang="scss" scoped>
.navigation {
  width: 8rem;
  height: 8rem;
  margin: 10px;
  padding: 0;
  cursor: pointer;
  border: 0;
  border-radius: 5rem;

  img {
    background-color: white;
    width: 8rem;
    height: 8rem;
    border-radius: 5rem;
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

.current-mystery,
.queued-found,
.queued-mystery {
}

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
