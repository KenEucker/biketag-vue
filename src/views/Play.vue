<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>
  <div class="queue-page">
    <div v-if="props.usingTimer && isViewingQueue()" class="mt-2 clock-div">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <span
      v-if="!uploadInProgress && getFormStep !== BiketagFormSteps[BiketagFormSteps.queueJoined]"
      class="tag-number"
      >#{{
        getCurrentBikeTag?.tagnumber + (getFormStep > BiketagFormSteps.queueFound ? 1 : 0)
      }}</span
    >
    <bike-tag-queue :only-mine="true" :show-number="false" />
    <div
      v-if="BiketagFormSteps[getFormStep] >= 1 && BiketagFormSteps[getFormStep] < 4"
      class="step"
    >
      <bike-tag-button
        :variant="BiketagFormSteps[getFormStep] == 1 ? 'circle-clean' : 'empty'"
        text="1"
      />
      <img
        v-if="BiketagFormSteps[getFormStep] == 1.5"
        class="step__arrow"
        :src="arrowSvg"
        alt="next"
      />
      <span v-else class="step__line" :style="`background-image: url(${lineSvg})`" />
      <bike-tag-button
        :variant="BiketagFormSteps[getFormStep] == 2 ? 'circle-clean' : 'empty'"
        text="2"
      />
      <img
        v-if="BiketagFormSteps[getFormStep] == 2.5"
        class="step__arrow"
        :src="arrowSvg"
        alt="next"
      />
      <span class="step__line" :style="`background-image: url(${lineSvg})`" />
      <bike-tag-button
        :variant="
          BiketagFormSteps[getFormStep] >= 3 && BiketagFormSteps[getFormStep] <= 4
            ? 'circle-clean'
            : 'empty'
        "
        text="3"
      />
    </div>

    <div v-if="!uploadInProgress" class="mb-5">
      <div v-if="getFormStep === BiketagFormSteps[BiketagFormSteps.addFoundImage]">
        <queue-found :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.roundJoined]">
        <queue-joined :tag="getPlayerTag" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.addMysteryImage]">
        <queue-mystery :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.addNewBikeTag]">
        <queue-submit :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.roundPosted]">
        <queue-posted :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.shareBikeTagPost]">
        <queue-posted-share :tag="getPlayerTag" />
      </div>
      <span v-if="isSubmittingData()" class="player-agree">
        * {{ t('pages.round.user_agree') }}
      </span>
      <form
        ref="queueError"
        name="post-tag-error"
        action="post-tag-error"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        hidden
      >
        <input type="hidden" name="form-name" value="post-tag-error" />
        <input type="hidden" name="submission" />
        <input type="hidden" name="playerId" :value="getPlayerId" />
        <input type="hidden" name="message" />
        <input type="hidden" name="ip" value="" />
      </form>
    </div>
  </div>
</template>

<script setup name="QueueBikeTagView">
import { ref, inject, computed, watchEffect, onMounted } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'
import { useI18n } from 'vue-i18n'
import LineSvg from '@/assets/images/line.svg'
import ArrowSvg from '@/assets/images/arrow.svg'

// components
import Loading from 'vue-loading-overlay'
import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import QueuePosted from '@/components/QueuePosted.vue'
import QueuePostedShare from '@/components/QueuePostedShare.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

// props
const props = defineProps({
  usingTimer: {
    type: Boolean,
    default: false,
  },
})

// data
const time = new Date()
time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
const timer = ref(useTimer(time.getSeconds()))
const uploadInProgress = ref(false)
const queueError = ref(null)
const lineSvg = LineSvg
const arrowSvg = ArrowSvg
const store = useBikeTagStore()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getFormStep = computed(() => store.getFormStep)
const getPlayerTag = computed(() => store.getPlayerTag)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getGameName = computed(() => store.getGameName)
const getPlayerId = computed(() => store.getPlayerId)

// methods
const isViewingQueue = () => getFormStep.value === BiketagFormSteps[BiketagFormSteps.viewPosted]
const isSubmittingData = () =>
  !(
    getFormStep.value === BiketagFormSteps[BiketagFormSteps.queueJoined] ||
    getFormStep.value === BiketagFormSteps[BiketagFormSteps.queuePosted] ||
    getFormStep.value === BiketagFormSteps[BiketagFormSteps.queuePostedShare]
  )
async function onQueueSubmit(newTagSubmission) {
  const { tag, formAction, formData, storeAction } = newTagSubmission
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message: t('notifications.uploading'),
    type: 'info',
    position: 'bottom',
  })
  const errorAction = queueError.value.getAttribute('action')

  uploadInProgress.value = true
  const success = await store[storeAction](tag)
  uploadInProgress.value = false

  if (success === true) {
    /// Get a clean cache
    await store.fetchTags(true)
    /// Update the queue
    await store.fetchQueuedTags(true)

    formData.set('game', getGameName.value)
    formData.set('tag', JSON.stringify(getPlayerTag.value))
    formData.set(
      'submission',
      `${getGameName.value}-${getPlayerTag.value.tagnumber}--${getPlayerTag.value.foundPlayer}`,
    )

    if (tag.foundImage) {
      formData.set('foundImageUrl', getPlayerTag.value.foundImageUrl)
    } else if (tag.mysteryImage) {
      formData.set('mysteryImageUrl', getPlayerTag.value.mysteryImageUrl)
    }
    return sendNetlifyForm(
      formAction,
      new URLSearchParams(formData).toString(),
      () => {
        toast.open({
          message: `${storeAction} ${t('notifications.success')}`,
          type: 'success',
          position: 'bottom',
        })
      },
      (m) => {
        toast.open({
          message: `${t('notifications.error')} ${m}`,
          type: 'error',
          duration: 10000,
          timeout: false,
          position: 'bottom',
        })
        return sendNetlifyError(m, undefined, errorAction)
      },
    )
  } else {
    const message = `${t('notifications.error')}: ${success}`
    toast.open({
      message,
      type: 'error',
      timeout: false,
      duration: 10000,
      position: 'bottom',
    })
    return sendNetlifyError(message, undefined, errorAction)
  }
}

// created
const created = async () => {
  await store.fetchCurrentBikeTag()
  await store.fetchQueuedTags(true)
}
created()

// Mounted
onMounted(() => {
  if (props.usingTimer) {
    watchEffect(async () => {
      if (timer.value.isExpired.valueOf) {
        console.warn('IsExpired')
      }
    })
  }

  uploadInProgress.value = false
})
</script>

<style lang="scss">
@import '../assets/styles/style';

#app {
  .queue-page {
    .card.polaroid .player-bicon .player-name {
      font-weight: 100;
      font-size: 3rem;
      transform: unset;
    }

    .queue-title {
      font-size: 2rem;
    }

    .queue-text {
      font-size: 1.5rem;
    }
  }
}
</style>
<style scoped lang="scss">
@import '../assets/styles/style';

.queue-page {
  .clock-div > i {
    color: forestgreen;
    cursor: pointer;
    font-size: 25px;
    margin-right: 10px;
  }

  .tag-number {
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 1.5rem;
  }
}

.realign-spinner {
  margin-left: -15%;

  @media (width >= 620px) {
    margin-left: 0;
  }
}

.player-agree {
  max-width: 50%;
  margin: auto;
  font-family: $default-secondary-font-family;
}

.step {
  .biketag__button {
    min-height: 3.5rem;
    cursor: initial;
  }

  &__line,
  &__arrow {
    min-width: 2.5rem;
    height: 1rem;
    display: inline-block;
    background-repeat: no-repeat;
    background-position: center;
    margin: 0 1rem;

    @media (min-width: $breakpoint-mobile-md) {
      min-width: 5rem;
    }
  }

  &__arrow {
    transform: scaleX(-1);
    height: $default-font-size;
    margin-bottom: 0.5rem;
  }
}
</style>
