<template>
  <div class="container queue-view">
    <swiper
      :modules="[Controller]"
      :pagination="{}"
      :effect="'coverflow'"
      :grab-cursor="true"
      :centered-slides="true"
      :slides-per-view="1"
      :coverflow-effect="{
        rotate: 50,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      }"
      :space-between="10"
      @swiper="setControlledSwiper"
    >
      <swiper-slide v-for="(tag, index) in getQueuedTags" :key="index">
        <bike-tag
          :key="tag.tagnumber"
          :tag="tag"
          size="l"
          :mystery-image-url="''"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :show-found-posted-date-time="true"
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <bike-tag-queue :pagination-ref="controlledSwiper" />
    <b-button v-if="showGoNextButton()" class="mb-2" @click="goNextQueueStep">{{
      goNextQueueStepButtonText
    }}</b-button>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import SwiperCore, { Controller, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import { stringifyNumber } from '@/common/utils'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import { BiketagFormSteps } from '@/common/types'

SwiperCore.use([Pagination])

export default defineComponent({
  name: 'QueueView',
  components: {
    Swiper,
    SwiperSlide,
    BikeTag,
    BikeTagQueue,
  },
  setup() {
    const controlledSwiper = ref(null)
    const setControlledSwiper = (swiper) => {
      controlledSwiper.value = swiper
    }

    return {
      Controller,
      controlledSwiper,
      setControlledSwiper,
    }
  },
  computed: {
    ...mapGetters(['getQueuedTags', 'getQueuedTag', 'getCurrentBikeTag', 'getQueuedTagState']),
    goNextQueueStepButtonText() {
      return `${
        this.getQueuedTag?.mysteryImageUrl?.length > 0
          ? this.$t('pages.queue.submit_queue')
          : this.getQueuedTag?.foundImageUrl?.length > 0
          ? this.$t('pages.queue.complete_queue')
          : this.$t('pages.queue.join_queue')
      } #${this.getCurrentBikeTag?.tagnumber ?? 1}!`
    },
  },
  methods: {
    stringifyNumber,
    goNextQueueStep: function () {
      this.$store.dispatch('setFormStepToJoin', true)
    },
    showGoNextButton() {
      return this.getQueuedTagState !== BiketagFormSteps.queuePosted
    },
  },
})
</script>
<style lang="scss">
#app {
  .queue-view {
    .card {
      .tag-number {
        display: none;
      }
      .player-name {
        line-height: 75%;
      }

      &.polaroid.found-tag {
        margin-top: -175px;
        padding-top: 175px;
        transform: rotate(-1deg);
      }

      &.polaroid.mystery-tag {
        transform: rotate(1deg);
      }
    }

    .swiper-pagination {
      display: none;
    }
  }
}
</style>
<style scoped>
i {
  color: #000;
  font-size: 20px;
}
</style>
