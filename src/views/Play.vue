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
      v-if="
        !uploadInProgress &&
        getFormStep !== BiketagQueueFormSteps[BiketagQueueFormSteps.queueJoined]
      "
      class="tag-number"
      >#{{
        getCurrentBikeTag?.tagnumber + (getFormStep > BiketagQueueFormSteps.queueFound ? 1 : 0)
      }}</span
    >
    <bike-tag-queue
      :only-mine="true"
      :show-number="false"
      @dequeue-error="dequeueErrorNotify(toast)"
      @dequeing="uploadInProgress = true"
      @dequeue-success="uploadInProgress = false"
    />
    <div
      v-if="BiketagQueueFormSteps[getFormStep] >= 1 && BiketagQueueFormSteps[getFormStep] < 4"
      class="step"
    >
      <bike-tag-button
        :variant="BiketagQueueFormSteps[getFormStep] == 1 ? 'circle-clean' : 'empty'"
        text="1"
      />
      <img
        v-if="BiketagQueueFormSteps[getFormStep] == 1.5"
        class="step__arrow"
        :src="arrowSvg"
        alt="next"
      />
      <span v-else class="step__line" :style="`background-image: url(${lineSvg})`" />
      <bike-tag-button
        :variant="BiketagQueueFormSteps[getFormStep] == 2 ? 'circle-clean' : 'empty'"
        text="2"
      />
      <img
        v-if="BiketagQueueFormSteps[getFormStep] == 2.5"
        class="step__arrow"
        :src="arrowSvg"
        alt="next"
      />
      <span class="step__line" :style="`background-image: url(${lineSvg})`" />
      <bike-tag-button
        :variant="
          BiketagQueueFormSteps[getFormStep] >= 3 && BiketagQueueFormSteps[getFormStep] <= 4
            ? 'circle-clean'
            : 'empty'
        "
        text="3"
      />
    </div>

    <div v-if="!uploadInProgress" class="mb-5">
      <div v-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.addFoundImage]">
        <queue-found :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.roundJoined]">
        <queue-joined :tag="getPlayerTag" />
      </div>
      <div v-else-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.addMysteryImage]">
        <queue-mystery :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.addNewBikeTag]">
        <queue-submit :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.roundPosted]">
        <queue-posted :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div
        v-else-if="getFormStep === BiketagQueueFormSteps[BiketagQueueFormSteps.shareBikeTagPost]"
      >
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
import ArrowSvg from '@/assets/images/arrow.svg'
import LineSvg from '@/assets/images/line.svg'
import { dequeueErrorNotify, getBannedIPs, sendNetlifyError, sendNetlifyForm } from '@/common'
import { BiketagQueueFormSteps } from '@/common/types'
import { useBikeTagStore } from '@/store/index'
import { publicIp } from 'public-ip'
import { computed, inject, onMounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimer } from 'vue-timer-hook'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import QueueFound from '@/components/QueueFound.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueuePosted from '@/components/QueuePosted.vue'
import QueuePostedShare from '@/components/QueuePostedShare.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import Loading from 'vue-loading-overlay'

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
const getGame = computed(() => store.getGame)
const getProfile = computed(() => store.getProfile)
const getGameName = computed(() => store.getGameName)
const getPlayerId = computed(() => store.getPlayerId)
const getPlayerName = computed(() => store.getPlayerName)
const getGameNotices = computed(() => store.getGameNotices)

// methods
const isViewingQueue = () =>
  getFormStep.value === BiketagQueueFormSteps[BiketagQueueFormSteps.viewPosted]
const isSubmittingData = () =>
  !(
    getFormStep.value === BiketagQueueFormSteps[BiketagQueueFormSteps.queueJoined] ||
    getFormStep.value === BiketagQueueFormSteps[BiketagQueueFormSteps.queuePosted] ||
    getFormStep.value === BiketagQueueFormSteps[BiketagQueueFormSteps.queuePostedShare]
  )
async function onQueueSubmit(newTagSubmission) {
  let isFoundTag = true
  const ipAddress = await publicIp()
  const bannedIPs = await getBannedIPs()

  // Check to see if IP address is banned
  if (bannedIPs.indexOf(ipAddress) !== -1) {
    localStorage.setItem('banned', 'true')
    return
  }

  if (getGame.value.settings['post::only-logged-in'] === 'true') {
    if (!getProfile.value?.nonce) {
      toast.open({
        message: `this game now requires you to log in to create new BikeTag posts`,
        type: 'error',
        position: 'top',
      })
      return
    }

    console.log('game is set to only allow logged in posts')
  }

  const { tag, formAction, formData, storeAction } = newTagSubmission
  const storeActionIsPosting = storeAction === 'postNewBikeTag'

  if (!tag.foundImage) {
    isFoundTag = false
  }

  const alreadyUploaded = localStorage.getItem(
    `${getGameName.value}-${getCurrentBikeTag.value?.tagnumber}${isFoundTag ? '--found' : '--mystery'}::posted`,
  )
  if (!storeActionIsPosting && alreadyUploaded) {
    const alreadyUploadedTime = parseInt(alreadyUploaded)
    const uploadDelay = getGameNotices.value?.imgurDelay ?? 1
    const delayMultiplier = Number.isNaN(parseInt(uploadDelay, 10)) ? 1 : parseInt(uploadDelay, 10)
    const delayMs = delayMultiplier * 60 * 1000
    const alreadyUploadedCheck = Date.now() - alreadyUploadedTime < delayMs

    if (alreadyUploadedCheck) {
      window.scrollTo(0, 0)
      toast.open({
        message: t('notifications.already-uploaded'),
        type: 'error',
        position: 'top',
      })
      if (store.getImageSource === 'imgur' && getGameNotices.value?.imgurDelayNotice) {
        toast.open({
          duration: 10000,
          message: getGameNotices.value.imgurDelayNotice,
          type: 'error',
          position: 'top',
        })
      }
      return
    }
  }

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message: t(storeActionIsPosting ? 'notifications.posting' : 'notifications.uploading'),
    type: 'info',
    position: 'bottom',
  })
  const errorAction = queueError.value.getAttribute('action')

  uploadInProgress.value = true
  const success = await store[storeAction](tag)
  uploadInProgress.value = false

  if (success === true) {
    /// Get a clean cache
    await store.fetchTags(false)
    /// Update the queue
    await store.fetchQueuedTags(false)

    formData.set('game', getGameName.value)
    formData.set('tag', JSON.stringify(getPlayerTag.value))
    formData.set(
      'submission',
      `${getGameName.value}-${getPlayerTag.value.tagnumber}--${getPlayerTag.value.foundPlayer}`,
    )
    formData.set('ip', ipAddress)

    if (tag.foundImage) {
      formData.set('foundImageUrl', getPlayerTag.value.foundImageUrl)
    } else if (tag.mysteryImage) {
      formData.set('mysteryImageUrl', getPlayerTag.value.mysteryImageUrl)
    }

    if (!storeActionIsPosting) {
      localStorage.setItem(
        `${getGameName.value}-${getCurrentBikeTag.value?.tagnumber}${isFoundTag ? '--found' : '--mystery'}::posted`,
        new Date().getTime(),
      )
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
  // await store.isReady()
  // await store.fetchCurrentBikeTag()
  // await store.fetchQueuedTags()

  if (getProfile.value?.nonce && !getPlayerName.value?.length) {
    toast.open({
      message: `you need to set your player name before you can create a post. go to <a href="${store.getGameNameUrl}/profile">your profile</a> to set it now.`,
      type: 'error',
      position: 'top',
    })
  }
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
