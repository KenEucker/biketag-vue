<template>
  <loading
    v-show="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="queue-page">
    <div v-if="usingTimer && isViewingQueue()" class="mt-2 clock-div">
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
    <bike-tag-queue :only-mine="true" />
    <div
      v-if="BiketagFormSteps[getFormStep] >= 1 && BiketagFormSteps[getFormStep] < 4"
      class="step mt-2 mb-4"
    >
      <bike-tag-button
        :variant="BiketagFormSteps[getFormStep] == 1 ? 'circle-clean' : 'empty'"
        text="1"
      />
      <img v-if="BiketagFormSteps[getFormStep] == 1.5" class="step__arrow" :src="arrowSvg" />
      <span v-else class="step__line" :style="`background-image: url(${lineSvg})`" />
      <bike-tag-button
        :variant="BiketagFormSteps[getFormStep] == 2 ? 'circle-clean' : 'empty'"
        text="2"
      />
      <img v-if="BiketagFormSteps[getFormStep] == 2.5" class="step__arrow" :src="arrowSvg" />
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
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.shareBikeTagPost]">
        <queue-posted-share :tag="getPlayerTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.roundPosted]">
        <queue-posted :tag="getPlayerTag" />
      </div>
      <span v-if="isSubmittingData()" class="player-agree">
        * {{ $t('pages.round.user_agree') }}
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
<script>
import { defineComponent, watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'

import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import QueuePosted from '@/components/QueuePosted.vue'
import QueuePostedShare from '@/components/QueuePostedShare.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import LineSvg from '@/assets/images/line.svg'
import ArrowSvg from '@/assets/images/arrow.svg'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueFound,
    QueueMystery,
    QueueSubmit,
    QueueJoined,
    QueuePosted,
    QueuePostedShare,
    BikeTagQueue,
    BikeTagButton,
  },
  props: {
    usingTimer: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const time = new Date()
    time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
    const timer = useTimer(time.getSeconds())
    onMounted(() => {
      watchEffect(async () => {
        if (timer.isExpired.value) {
          console.warn('IsExpired')
        }
      })
    })
    return {
      timer,
      BiketagFormSteps,
      uploadInProgress: false,
      countDown: 10,
      lineSvg: LineSvg,
      arrowSvg: ArrowSvg,
    }
  },
  computed: {
    ...mapGetters([
      'getFormStep',
      'getPlayerTag',
      'getCurrentBikeTag',
      'getGameName',
      'getPlayerId',
    ]),
  },
  async mounted() {
    this.uploadInProgress = false
  },
  async created() {
    await this.$store.dispatch('setCurrentBikeTag', true)
    await this.$store.dispatch('setQueuedTags', true)
    this.countDownTimer()
  },
  methods: {
    isViewingQueue() {
      return this.getFormStep === BiketagFormSteps[BiketagFormSteps.viewPosted]
    },
    countDownTimer() {
      if (this.countDown > 0) {
        setTimeout(() => {
          this.countDown -= 1
          this.countDownTimer()
        }, 500)
      }
    },
    isSubmittingData() {
      return !(
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queueJoined] ||
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queuePosted] ||
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queuePostedShare]
      )
    },
    async onQueueSubmit(newTagSubmission) {
      const { tag, formAction, formData, storeAction } = newTagSubmission
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual'
      }
      window.scrollTo(0, 0)

      this.$toast.open({
        message: this.$t('notifications.uploading'),
        type: 'info',
        position: 'top',
      })
      const errorAction = this.$refs.queueError.getAttribute('action')

      this.uploadInProgress = true
      const success = await this.$store.dispatch(storeAction, tag)
      this.uploadInProgress = false

      if (success === true) {
        /// Get a clean cache
        await this.$store.dispatch('setTags', true)
        /// Update the queue
        this.$store.dispatch('setQueuedTags', true)

        formData.set('game', this.getGameName)
        formData.set('tag', JSON.stringify(this.getPlayerTag))
        formData.set(
          'submission',
          `${this.getGameName}-${this.getPlayerTag.tagnumber}--${this.getPlayerTag.foundPlayer}`
        )

        if (tag.foundImage) {
          formData.set('foundImageUrl', this.getPlayerTag.foundImageUrl)
        } else if (tag.mysteryImage) {
          formData.set('mysteryImageUrl', this.getPlayerTag.mysteryImageUrl)
        }
        return sendNetlifyForm(
          formAction,
          new URLSearchParams(formData).toString(),
          () => {
            this.$toast.open({
              message: `${storeAction} ${this.$t('notifications.success')}`,
              type: 'success',
              position: 'top',
            })
          },
          (m) => {
            this.$toast.open({
              message: `${this.$t('notifications.error')} ${m}`,
              type: 'error',
              timeout: false,
              position: 'bottom',
            })
            return sendNetlifyError(m, undefined, errorAction)
          }
        )
      } else {
        const message = `${this.$t('notifications.error')}: ${success}`
        this.$toast.open({
          message,
          type: 'error',
          timeout: false,
          position: 'bottom',
        })
        return sendNetlifyError(message, undefined, errorAction)
      }
    },
  },
})
</script>
<style lang="scss">
#app {
  .queue-page {
    .card.polaroid .player-wrapper .player-name {
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
  @media (min-width: 620px) {
    margin-left: 0;
  }
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
    height: 1.5rem;
    margin-bottom: 0.5rem;
  }
}
</style>
