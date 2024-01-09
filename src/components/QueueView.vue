<template>
  <div class="container align-center">
    <bike-tag-queue :pagination-ref="controlledSwiper" size="m" />
  </div>
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
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <div class="container align-center">
      <bike-tag-button
        v-if="showGoNextButton"
        class="go-next-button"
        variant="medium"
        :text="goNextQueueStepButtonText"
        @click="goNextQueueStep"
      />
    </div>
  </div>
</template>

<script setup name="QueueView">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import SwiperCore, { Controller, Pagination } from 'swiper'
import 'swiper/css/bundle'
import { stringifyNumber } from '@/common/utils'
import { BiketagFormSteps } from '@/common/types'

// components
import { Swiper, SwiperSlide } from 'swiper/vue'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'

SwiperCore.use([Pagination])

// data
const controlledSwiper = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const { t } = useI18n()

// computed
const getQueuedTags = computed(() => store.getQueuedTags)
const getPlayerTag = computed(() => store.getPlayerTag)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getQueuedTagState = computed(() => store.getQueuedTagState)
const goNextQueueStepButtonText = computed(
  () =>
    `${
      getPlayerTag.value?.mysteryImageUrl?.length > 0
        ? t('pages.round.submit_queue')
        : getPlayerTag.value?.foundImageUrl?.length > 0
          ? t('pages.round.complete_queue')
          : t('pages.round.join_queue')
    } #${getCurrentBikeTag.value?.tagnumber ?? 1}!`,
)
const showGoNextButton = computed(() => getQueuedTagState.value !== BiketagFormSteps.roundPosted)

// methods
function goNextQueueStep() {
  router.push('/play')
}
const setControlledSwiper = (swiper) => {
  controlledSwiper.value = swiper
}
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

    .container.align-center {
      flex-flow: wrap;
    }

    .go-next-button span {
      min-width: 10em;
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
