<template>
  <div></div>
  <div v-if="!getQueuedTags?.length" class="container queue-approve-tag">
    <h3 class="queue-title">{{ $t('pages.round.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.empty_text') }}</p>
  </div>
  <div v-else class="container queue-approve-tag queue-approve">
    <h3 class="queue-title">{{ $t('pages.round.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.approve_text') }}</p>
    <bike-tag-queue :pagination-ref="controlledSwiper" :show-number="true" size="m" />
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
          :show-posted-date="true"
          :tag="tag"
          :show-in-boundary="true"
          size="l"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :mystery-description="mysteryDescription(tag)"
        />
        <bike-tag
          v-else
          :key="tag.playerId"
          :reverse="true"
          :tag="tag"
          size="l"
          :show-posted-date="false"
          :sized-mystery-image="false"
          mystery-image-url="/images/no_image.webp"
          mystery-description="Mystery image not yet uploaded"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <div class="container">
      <div class="approve-button row just-center">
        <form
          v-if="currentIsReadyForApproval"
          ref="approveTag"
          name="approve-new-biketag"
          action="approve-new-biketag"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          @submit.prevent="approveTagFunction"
        >
          <input type="hidden" name="form-name" value="approve-new-biketag" />
          <input type="hidden" name="ambassadorId" value="" />
          <span>APPROVE</span>
          <bike-tag-button class="circle-button" variant="circle" type="submit" label="Approve">
            <img src="/images/green-circle-check.webp" alt="Approve This Tag" />
          </bike-tag-button>
        </form>
        <form
          ref="dequeueTag"
          name="dequeue-queued-tag"
          action="dequeue-queued-tag"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          @submit.prevent="dequeueTagConfirm"
        >
          <input type="hidden" name="form-name" value="dequeue-queued-tag" />
          <input type="hidden" name="ambassadorId" value="" />
          <bike-tag-button class="circle-button" variant="circle" type="submit" label="Remove">
            <img src="/images/red-circle-x.webp" alt="Delete This Tag" />
          </bike-tag-button>
          <span>REMOVE</span>
        </form>
        <b-modal
          v-model="confirmRemove"
          class="confirm-modal"
          title="Confirm Removal of Queued Tag"
          @ok="dequeueTagFunction"
        >
          <p>{{ $t('pages.approve.confirm_remove') }}</p>
        </b-modal>
      </div>
      <div class="row">
        <span class="player-agree"> * {{ $t('pages.round.approve_agree') }} </span>
        <img class="ambassador-icon" src="/images/biketag-ambassador.svg" alt="Ambassador Icon" />
      </div>
    </div>
  </div>
</template>

<script setup name="QueueApprove">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import SwiperCore, { Controller, Pagination } from 'swiper'
import 'swiper/css/bundle'
import { stringifyNumber } from '@/common/utils'
import { useI18n } from 'vue-i18n'

// components
import { Swiper, SwiperSlide } from 'swiper/vue'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

SwiperCore.use([Pagination])

// data
const emit = defineEmits(['submit'])
const controlledSwiper = ref(null)
const setControlledSwiper = (swiper) => {
  controlledSwiper.value = swiper
}
const confirmRemove = ref(false)
const dequeueTag = ref(null)
const approveTag = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const { t } = useI18n()

// computed
const getQueuedTags = computed(() => store.getQueuedTags)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const currentlySelectedTag = computed(() => {
  return getQueuedTags.value[controlledSwiper.value?.activeIndex]
})
const currentIsReadyForApproval = computed(
  () => currentlySelectedTag.value?.mysteryImageUrl && currentlySelectedTag.value?.foundImageUrl,
)

// methods
function dequeueTagConfirm() {
  confirmRemove.value = true
}
function dequeueTagFunction() {
  const formAction = dequeueTag.value.getAttribute('action')
  const formData = new FormData(dequeueTag.value)

  emit('submit', {
    formAction,
    formData,
    tag: currentlySelectedTag.value,
    storeAction: 'dequeueTag',
  })
}
function approveTagFunction() {
  const formAction = approveTag.value.getAttribute('action')
  const formData = new FormData(approveTag.value)
  const approvedTag = currentlySelectedTag.value

  emit('submit', {
    formAction,
    formData,
    tag: approvedTag,
    storeAction: 'approveTag',
  })
}
function mysteryDescription(tag) {
  return `"${tag?.hint}"`
}

// mounted
onMounted(async () => {
  if (!isBikeTagAmbassador.value) {
    const uhuhuh = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          console.log("YOU DIDN'T SAY THE MAGIC WORD!")
          resolve()
        }, 1)
      })
    /// kick it sideways
    for (let x = 0; x < 1000; ++x) {
      await uhuhuh()
    }
    router.push('/')
  }
})
</script>

<style lang="scss">
@import '../assets/styles/style';

.queue-approve {
  .card .tag-number {
    display: none;
  }

  .swiper-pagination {
    display: none;
  }

  .circle-button {
    max-width: 100px;

    img {
      max-width: 85px;
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

i {
  color: #000;
  font-size: 20px;
}

.ambassador-icon {
  max-height: 10vh;
}

form {
  flex-basis: fit-content;
  display: flex;
}

.player-agree {
  max-width: 50%;
  margin: auto;
  font-family: $default-secondary-font-family;
}

.approve-button {
  font-family: $default-font-family;
  vertical-align: middle;

  span {
    margin: auto;
    padding-left: 1em;
    padding-right: 1em;
  }
}
</style>
