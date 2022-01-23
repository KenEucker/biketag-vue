<template>
  <loading
    v-if="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container col-lg-6 queue-page">
    <div v-if="usingTimer && isViewingQueue()" class="clock-div mt-2">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <span
      v-if="
        !uploadInProgress &&
        getFormStep !== BiketagFormSteps[BiketagFormSteps.queueJoined] &&
        isViewingQueue()
      "
      class="tag-number"
      >#{{ getCurrentBikeTag.tagnumber }}</span
    >
    <bike-tag-queue v-if="!isViewingQueue()" :only-mine="true" />
    <div v-if="!uploadInProgress" class="container">
      <div v-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueView]">
        <queue-view />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueFound]">
        <queue-found :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueJoined]">
        <queue-joined :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueMystery]">
        <queue-mystery :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueSubmit]">
        <queue-submit :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queuePosted]">
        <queue-posted :tag="getQueuedTag" @submit="onQueueSubmit" />
      </div>
      <span
        v-if="!isViewingQueue() && getFormStep !== BiketagFormSteps[BiketagFormSteps.queueJoined]"
        class="user_agree"
      >
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
        @submit.prevent="onSubmit"
      >
        <input type="hidden" name="form-name" value="queue-tag-error" />
        <input type="hidden" name="message" />
        <input type="hidden" name="ip" value="" />
      </form>
    </div>
  </div>
</template>
<script>
import { defineComponent, watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/store/index'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'

import QueueView from '@/components/QueueView.vue'
import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import QueuePosted from '@/components/QueueJoined.vue'
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
    const timer = useTimer(time)
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
    ...mapGetters(['getFormStep', 'getQueuedTag', 'getCurrentBikeTag', 'getGameName']),
  },
  mounted() {
    this.uploadInProgress = false
  },
  created() {
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
    isViewingQueue() {
      return (
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queueView] ||
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queuePosted]
      )
    },
    async onQueueSubmit(newTagSubmission) {
      const { tag, formAction, formData, storeAction } = newTagSubmission

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
          `${this.getQueuedTag.foundPlayer}-${this.getQueuedTag.tagnumber}`
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
            console.log({ formSubmitted: res })
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
              position: 'top',
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
          position: 'top',
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
      font-family: MarkerNotes;
      font-weight: 100;
      font-size: 3rem;
      transform: unset;
    }
    .queue-title {
      font-size: 1rem;
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

  .user_agree {
    font-size: 0.75rem;
    font-style: italic;
  }
  .realign-spinner {
    margin-left: -30%;
  }
}
</style>
