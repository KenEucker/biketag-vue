<template>
  <div class="container">
    <swiper
      :modules="[Controller]"
      :pagination="{}"
      :effect="'coverflow'"
      :grab-cursor="true"
      :centered-slides="true"
      :slides-per-view="'auto'"
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
          :reverse="tag?.mysteryImageUrl?.length > 0"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
        />
      </swiper-slide>
    </swiper>
    <bike-tag-queue :pagination-ref="controlledSwiper" />
    <b-button @click="goNextQueueStep">{{ goNextQueueStepButtonText }}</b-button>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import 'vue-loading-overlay/dist/vue-loading.css'
import SwiperCore, { Controller, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'

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
    ...mapGetters(['getQueuedTags', 'getQueuedTag', 'getCurrentBikeTag']),
    goNextQueueStepButtonText() {
      return `${
        this.getQueuedTag?.mysteryImageUrl?.length > 0
          ? this.$t('pages.queue.submit_queue')
          : this.getQueuedTag?.foundImageUrl?.length > 0
          ? this.$t('pages.queue.complete_queue')
          : this.$t('pages.queue.join_queue')
      } #${this.getCurrentBikeTag.tagnumber}!`
    },
  },
  methods: {
    goNextQueueStep: function () {
      this.$store.dispatch('setFormStepJoin', true)
      // if (this.getQueuedTag?.mysteryImageUrl?.length > 0) {
      //   this.$store.dispatch('resetFormStepToMystery')
      // } else if (this.getQueuedTag?.foundImageUrl?.length > 0) {
      //   this.$store.dispatch('resetFormStepToFound')
      // } else {
      // }
    },
  },
})
</script>
<style>
.card .tag-number {
  display: none;
}

.swiper-pagination {
  display: none;
}
</style>
<style scoped>
i {
  color: #000;
  font-size: 20px;
}
</style>