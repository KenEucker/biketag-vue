<template>
  <div v-if="tag" class="container">
    <div class="bike-pagination-bullet">
      <span v-if="showNumber">{{ tag.tagnumber }}</span>
      <img :src="tag.mysteryImageUrl" />
      <img :src="tag.foundImageUrl" />
    </div>
  </div>
  <div v-else-if="getCurrentBikeTag" class="container">
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

      <b-button v-if="getPlayerTag.foundImageUrl" id="queued-found-popover" class="navigation">
        <img class="img-fluid" :src="getImgurImageSized(getPlayerTag.foundImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getPlayerTag.foundImageUrl?.length > 0"
        target="queued-found-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-found"
      >
        <template #title>{{ $t('components.queue.view_found_image') }}</template>
        <img class="img-fluid" :src="getPlayerTag.foundImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToFound">{{
            $t('components.queue.reset_queue_button')
          }}</b-button>
        </div>
      </b-popover>

      <b-button
        v-if="getPlayerTag.mysteryImageUrl?.length > 0"
        id="queued-mystery-popover"
        class="navigation"
      >
        <img class="img-fluid" :src="getImgurImageSized(getPlayerTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getPlayerTag.mysteryImageUrl?.length > 0"
        target="queued-mystery-popover"
        triggers="hover focus"
        placement="bottom"
        class="queued-mystery"
      >
        <template #title>{{ $t('components.queue.view_mystery_image') }}</template>
        <img class="img-fluid" :src="getPlayerTag.mysteryImageUrl" />
        <div v-if="canReset()" class="row">
          <b-button class="col" variant="danger" @click="resetToMystery">{{
            $t('components.queue.reset_queue_button')
          }}</b-button>
        </div>
      </b-popover>
    </div>
    <div v-if="!onlyMine" class="bike-pagination mt-3 mb-3">
      <div v-for="(mine, index) in getQueuedTags" :key="index" class="bike-pagination-bullet">
        <img :src="mine.foundImageUrl" @click="paginationClick(index)" />
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
  },
  computed: {
    ...mapGetters([
      'getQueuedTags',
      'getCurrentBikeTag',
      'getPlayerTag',
      'getImgurImageSized',
      'getQueuedTagState',
    ]),
  },
  methods: {
    canReset() {
      return this.getQueuedTagState !== BiketagFormSteps.roundPosted
    },
    async resetToFound() {
      await this.$store.dispatch('fetchCredentials')
      return this.$store.dispatch('dequeueFoundTag').then((dequeueSuccessful) => {
        if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
          return this.$toast.open({
            message: `dequeue tag error: ${dequeueSuccessful}`,
            type: 'error',
            timeout: false,
            position: 'bottom',
          })
        } else {
          this.$nextTick(() => {
            this.$router.go()
          })
        }
      })
    },
    async resetToMystery() {
      await this.$store.dispatch('fetchCredentials')
      return this.$store.dispatch('dequeueMysteryTag').then((dequeueSuccessful) => {
        if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
          return this.$toast.open({
            message: `dequeue tag error: ${dequeueSuccessful}`,
            type: 'error',
            timeout: false,
            position: 'bottom',
          })
        } else {
          this.$nextTick(() => {
            this.$router.go()
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
