<template>
  <loading v-if="uploadInProgress" v-model:active="uploadInProgress" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="conainer">
    <div v-if="usingTimer && isViewingQueue()" class="clock-div mt-2">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <span v-if="!uploadInProgress && isViewingQueue()" class="tag-number"
      >#{{ getCurrentBikeTag.tagnumber }}</span
    >
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
      <div v-if="!isViewingQueue()">
        <bike-tag-queue :only-mine="true" />
        <span> * {{ $t('pages.queue.user_agree') }} </span>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent, watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/store/index'
import { useTimer } from 'vue-timer-hook'

import QueueView from '@/components/QueueView.vue'
import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import QueueSubmit from '@/components/QueueSubmit.vue'
import QueueJoined from '@/components/QueueJoined.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueView,
    QueueFound,
    QueueMystery,
    QueueSubmit,
    QueueJoined,
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
    ...mapGetters(['getFormStep', 'getQueuedTag', 'getCurrentBikeTag']),
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
        this.getFormStep === BiketagFormSteps[BiketagFormSteps.queueJoined]
      )
    },
    async onQueueSubmit(newTagSubmission) {
      const { tag, formAction, formBody, storeAction } = newTagSubmission
      this.$toast.open({ message: this.$t('notifications.uploading'), type: 'info' })

      this.uploadInProgress = true
      const success = await this.$store.dispatch(storeAction, tag)
      this.uploadInProgress = false

      if (success === true) {
        return fetch(formAction, {
          method: 'POST',
          headers: {
            Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          formBody,
        }).then((res) => {
          console.log({ formSubmitted: res })
          /// TODO: check for success, regardless the image has been added to the queue already
          this.$toast.open({
            message: `${storeAction} ${this.$t('notifications.success')}`,
            type: 'success',
          })
        })
      } else {
        this.$toast.open({
          message: `${this.$t('notifications.error')}: ${success}`,
          type: 'error',
        })
      }
    },
  },
})
</script>
<style scoped>
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
</style>
