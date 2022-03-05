<template>
  <loading
    v-show="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <!-- <div class="container col-md-8 col-lg-8 queue-page"> -->
  <div class="queue-page">
    <div v-if="usingTimer && isViewingQueue()" class="clock-div mt-2">
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
    <bike-tag-queue v-if="!isViewingQueue()" :only-mine="true" />
    <!-- <div v-if="!uploadInProgress" class="container"> -->
    <div v-if="!uploadInProgress" class="queue-slider">
      <div v-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueView]">
        <queue-view />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueFound]">
        <queue-found :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueJoined]">
        <queue-joined :tag="getQueuedTag" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueMystery]">
        <queue-mystery :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueSubmit]">
        <queue-submit :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queuePostedShare]">
        <queue-posted-share :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queuePosted]">
        <queue-posted :tag="getQueuedTag" />
      </div>
      <span v-if="isSubmittingData()" class="player-agree">
        * {{ $t('pages.queue.user_agree') }}
      </span>
      <form
        ref="queueError"
        name="queue-tag-error"
        action="queue-tag-error"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        hidden
      >
        <input type="hidden" name="form-name" value="queue-tag-error" />
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

import QueueView from '@/components/QueueView.vue'
import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import QueuePosted from '@/components/QueuePosted.vue'
import QueuePostedShare from '@/components/QueuePostedShare.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueView,
    QueueFound,
    QueueMystery,
    QueueSubmit,
    QueueJoined,
    QueuePosted,
    QueuePostedShare,
    BikeTagQueue,
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
    }
  },
  computed: {
    ...mapGetters([
      'getFormStep',
      'getQueuedTag',
      'getCurrentBikeTag',
      'getGameName',
      'getPlayerId',
    ]),
  },
  async mounted() {
    this.uploadInProgress = false
  },
  async created() {
    // await this.$store.dispatch('setCurrentBikeTag')
    // await this.$store.dispatch('setQueuedTags', true)
    this.countDownTimer()
  },
  methods: {
    countDownTimer() {
      if (this.countDown > 0) {
        setTimeout(() => {
          this.countDown -= 1
          this.countDownTimer()
        }, 500)
      }
    },
    isSubmittingData() {
      return (
        !this.isViewingQueue() &&
        !(
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.queueJoined] ||
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.queuePosted] ||
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.queuePostedShare]
        )
      )
    },
    isViewingQueue() {
      return this.getFormStep === BiketagFormSteps[BiketagFormSteps.queueView]
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
        /// Update the queue
        this.$store.dispatch('setQueuedTags', true)

        formData.set('game', this.getGameName)
        formData.set('tag', JSON.stringify(this.getQueuedTag))
        formData.set(
          'submission',
          `${this.getGameName}-${this.getQueuedTag.tagnumber}--${this.getQueuedTag.foundPlayer}`
        )

        if (tag.foundImage) {
          formData.set('foundImageUrl', this.getQueuedTag.foundImageUrl)
        } else if (tag.mysteryImage) {
          formData.set('mysteryImageUrl', this.getQueuedTag.mysteryImageUrl)
        }
        return sendNetlifyForm(
          formAction,
          new URLSearchParams(formData).toString(),
          (res) => {
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
</style>
