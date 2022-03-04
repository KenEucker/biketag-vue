<template>
  <div v-if="!getQueuedTags.length" class="queue-approve-tag container">
    <h3 class="queue-title">{{ $t('pages.queue.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.empty_text') }}</p>
  </div>
  <div v-else class="queue-approve-tag container queue-approve">
    <h3 class="queue-title">{{ $t('pages.queue.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.approve_text') }}</p>

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
          v-if="tag.mysteryImageUrl?.length && tag.foundImageUrl?.length"
          :key="tag.tagnumber"
          :reverse="true"
          :show-posted-date-time="true"
          :tag="tag"
          size="l"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :found-description="`found at (${tag.foundLocation})`"
          :mystery-description="mysteryDescription(tag)"
        />
        <bike-tag
          v-else
          :key="tag.tagnumber"
          :reverse="true"
          :tag="tag"
          size="l"
          :show-posted-date="false"
          :sized-mystery-image="false"
          mystery-image-url="@/assets/images/blank.png"
          mystery-description="Mystery image not yet uploaded"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <bike-tag-queue :pagination-ref="controlledSwiper" :show-number="true" />
    <div class="container">
      <div class="row">
        <div class="col-md-6">
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
            <input type="hidden" name="ambassadorId" value="" />
            <bike-tag-button
              class="w-75 btn-approve mt-2 mb-2 border-0"
              variant="primary"
              @click="onSubmit"
            >
              {{ $t('pages.queue.approve_new_tag') }}&nbsp;
              {{ $t('pages.queue.approve_new_tag_from') }}&nbsp;#{{ selectedTagPlayer() }}&nbsp;({{
                mysteryPlayer()
              }})
            </bike-tag-button>
          </form>
        </div>
        <div class="col-md-6">
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
            <input type="hidden" name="ambassadorId" value="" />
            <bike-tag-button class="w-75 mt-2 mb-2 border-0" variant="danger" @click="dequeueTag">
              {{ $t('pages.queue.dequeue_queued_tag') }} &nbsp;
            </bike-tag-button>
          </form>
        </div>
        <span class="player-agree"> * {{ $t('pages.queue.approve_agree') }} </span>
      </div>
    </div>
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
import BikeTagButton from '@/components/BikeTagButton.vue'

SwiperCore.use([Pagination])

export default defineComponent({
  name: 'QueueApprove',
  components: {
    Swiper,
    SwiperSlide,
    BikeTag,
    BikeTagQueue,
    BikeTagButton,
  },
  emits: ['submit'],
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
    ...mapGetters([
      'getQueuedTags',
      'getQueuedTag',
      'getCurrentBikeTag',
      'isBikeTagAmbassador',
      'getProfile',
    ]),
  },
  mounted() {
    if (!this.isBikeTagAmbassador) {
      /// kick it sideways
      this.$router.push('/')
    }
  },
  methods: {
    dequeueTag() {
      const tagToDequeue = {
        ambassadorId: this.getProfile.sub,
      }
      return this.$store.dispatch('dequeueTag', tagToDequeue).then((dequeueSuccessful) => {
        if (!dequeueSuccessful || typeof dequeueSuccessful === 'string') {
          this.$toast.open({
            message: `dequeue tag error: ${dequeueSuccessful}`,
            type: 'error',
            timeout: false,
            position: 'bottom',
          })
          return this.$store.dispatch('setQueuedTags', true)
        } else {
          return this.$toast.open({
            message: 'tag successfully dequeued',
            type: 'success',
            timeout: false,
            position: 'top',
          })
        }
      })
    },
    onSubmit() {
      const formAction = this.$refs.approveTag.getAttribute('action')
      const formData = new FormData(this.$refs.approveTag)
      const approvedTag = {
        ambassadorId: this.getProfile.sub,
        expiry: window.location.expiry,
      }

      this.$emit('submit', {
        formAction,
        formData,
        tag: approvedTag,
        storeAction: 'getAmbassadorPermission',
      })
    },
    mysteryDescription(tag) {
      return `"${tag?.hint}"`
    },
    mysteryPlayer() {
      return 'ken'
    },
    selectedTagPlayer() {
      return 1
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
<style lang="scss" scoped>
i {
  color: #000;
  font-size: 20px;
}
</style>
