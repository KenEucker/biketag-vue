<template>
  <div v-if="getCurrentBikeTag" class="container">
    <div v-if="onlyMine">
      <b-button id="current-mystery-popover" class="navigation">
        <img class="img-fluid" :src="getImgurImageSized(getCurrentBikeTag.mysteryImageUrl, 's')" />
      </b-button>
      <b-popover target="current-mystery-popover" triggers="hover focus" placement="bottom">
        <b-button id="popover-view-mystery" variant="primary">{{
          $t('components.queue.view_queue_button')
        }}</b-button>
        <b-popover target="popover-view-mystery" triggers="focus click" placement="top">
          <template #title>{{ $t('components.queue.current_mystery_location') }}</template>
          <img class="img-fluid" :src="getCurrentBikeTag.mysteryImageUrl" />
        </b-popover>
      </b-popover>

      <b-button v-if="getQueuedTag.foundImageUrl" id="queued-found-popover" class="navigation">
        <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.foundImageUrl, 's')" />
      </b-button>
      <b-popover
        v-if="getQueuedTag.foundImageUrl?.length > 0"
        target="queued-found-popover"
        triggers="focus"
        placement="bottom"
      >
        <b-button id="popover-view-found" variant="primary">{{
          $t('components.queue.view_queue_button')
        }}</b-button>
        <b-popover target="popover-view-found" triggers="focus click" placement="top">
          <template #title>{{ $t('components.queue.view_found_image') }}</template>
          <img class="img-fluid" :src="getQueuedTag.foundImageUrl" />
        </b-popover>
        <b-button
          v-if="getQueuedTag?.foundImageUrl?.length > 0"
          variant="danger"
          class="ms-2"
          @click="resetToFound"
          >{{ $t('components.queue.reset_queue_button') }}</b-button
        >
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
        triggers="focus"
        placement="bottom"
      >
        <b-button id="popover-view-mystery" variant="primary">{{
          $t('components.queue.view_queue_button')
        }}</b-button>
        <b-popover target="popover-view-mystery" triggers="focus click" placement="top">
          <template #title>{{ $t('components.queue.view_mystery_image') }}</template>
          <img class="img-fluid" :src="getQueuedTag.mysteryImageUrl" />
        </b-popover>
        <b-button variant="danger" class="ms-2" @click="resetToMystery">{{
          $t('components.queue.reset_queue_button')
        }}</b-button>
      </b-popover>
    </div>
    <div v-if="!onlyMine" class="bike-pagination mt-3 mb-3">
      <img
        v-for="(tag, index) in getQueuedTags"
        :key="index"
        class="bike-pagination-bullet"
        :src="tag.foundImageUrl"
        @click="paginationClick(index)"
      />
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTagQueue',
  props: {
    onlyMine: {
      type: Boolean,
      default: false,
    },
    paginationRef: {
      type: Object,
      default: null,
    },
  },
  computed: {
    ...mapGetters(['getQueuedTags', 'getCurrentBikeTag', 'getQueuedTag', 'getImgurImageSized']),
  },
  methods: {
    resetToFound() {
      this.$store.dispatch('resetFormStepToFound')
    },
    resetToMystery() {
      this.$store.dispatch('resetFormStepToMystery')
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
    width: 5rem;
    height: 5rem;
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

.bike-pagination-bullet {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 5rem;
  height: 5rem;
  margin: 5px;
  border-radius: 5rem;
  cursor: pointer;
}
</style>
