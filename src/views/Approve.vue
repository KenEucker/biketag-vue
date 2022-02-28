<template>
  <loading
    v-show="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="queue-page">
    <queue-approve />
    <span class="user-agree"> * {{ $t('pages.queue.user_agree') }} </span>
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
      <input type="hidden" name="submission" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <input type="hidden" name="message" />
      <input type="hidden" name="ip" value="" />
    </form>
  </div>
</template>
<script>
import { defineComponent, watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'

import QueueApprove from '@/components/QueueApprove.vue'

export default defineComponent({
  name: 'ApproveBikeTagView',
  components: {
    QueueApprove,
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
    await this.$store.dispatch('setCurrentBikeTag')
    await this.$store.dispatch('setQueuedTags', true)
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
  },
})
</script>
<style scoped lang="scss"></style>
