<template>
  <div class="container queue-approve">
    <h3 class="queue-title">{{ $t('pages.queue.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.posted_text') }}</p>

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
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <bike-tag-queue :pagination-ref="controlledSwiper" />
    <form
      ref="approveTag"
      name="approve-queued-tag"
      action="approve-queued-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="approve-queued-tag" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <b-button class="w-75 btn-post mt-2 mb-2 border-0" @click="onSubmit">
        {{ $t('pages.queue.approve_new_tag') }} &nbsp;
      </b-button>
    </form>
    <form
      ref="dequeueTag"
      name="dequeue-queued-tag"
      action="dequeue-queued-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      @submit.prevent="dequeueTag"
    >
      <input type="hidden" name="form-name" value="dequeue-queued-tag" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <b-button class="w-75 btn-post mt-2 mb-2 border-0" @click="dequeueTag">
        {{ $t('pages.queue.dequeue_queued_tag') }} &nbsp;
      </b-button>
    </form>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import 'vue-loading-overlay/dist/vue-loading.css'
import SwiperCore, { Controller, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import { stringifyNumber } from '@/common/utils'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'

SwiperCore.use([Pagination])

export default defineComponent({
  name: 'QueueApprove',
  components: {
    Swiper,
    SwiperSlide,
    BikeTag,
    BikeTagQueue,
  },
  emits: ['submit'],
  setup() {
    if (!this.getAmbassadorId?.length > 0) {
      /// kick it sideways
      this.$router.push('/')
    }

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
    ...mapGetters(['getQueuedTags', 'getQueuedTag', 'getCurrentBikeTag', 'getExpiry']),
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
    dequeueTag() {
      /// TODO: pop confirmation modal?
      this.$store.dispatch('dequeueTag', true)
    },
    onSubmit() {
      const formAction = this.$refs.approveTag.getAttribute('action')
      const formData = new FormData(this.$refs.approveTag)
      const approvedTag = {
        ambassadorId: this.getAmbassadorId,
        expiry: window.location.expiry,
      }
      console.log({ controlledSwiper: this.controlledSwiper })

      this.$emit('submit', {
        formAction,
        formData,
        tag: approvedTag,
        storeAction: 'getAmbassadorPermission',
      })
    },
    stringifyNumber,
  },
})
</script>
<style lang="scss">
.queue-approve {
  .card .tag-number {
    display: none;
  }

  .swiper-pagination {
    display: none;
  }
}
</style>
<style scoped>
i {
  color: #000;
  font-size: 20px;
}
</style>
