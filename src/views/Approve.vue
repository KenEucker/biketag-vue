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
    <queue-approve @submit="onApproveSubmit" />
    <form
      ref="queueError"
      name="queue-approve-error"
      action="queue-approve-error"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      hidden
    >
      <input type="hidden" name="form-name" value="queue-tag-error" />
      <input type="hidden" name="submission" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
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
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'
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
      'getAmbassadorId',
    ]),
  },
  async mounted() {
    await this.$store.dispatch('fetchCredentials')
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
    async onApproveSubmit(newTagSubmission) {
      const { tag, formAction, formData, storeAction } = newTagSubmission
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual'
      }
      window.scrollTo(0, 0)

      this.$toast.open({
        message:
          storeAction.indexOf('approve') !== -1
            ? this.$t('notifications.approving')
            : this.$t('notifications.removing'),
        type: 'info',
        position: 'top',
      })
      const errorAction = this.$refs.queueError.getAttribute('action')

      console.log('onApproveSubmit', { storeAction, tag })

      this.uploadInProgress = true
      const success = await this.$store.dispatch(storeAction, tag)
      this.uploadInProgress = false

      if (success === true) {
        /// Update the queue
        this.$store.dispatch('setQueuedTags', true)

        formData.set('game', this.getGameName)
        formData.set('tag', JSON.stringify(this.getQueuedTag))
        formData.set(
          'approve',
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
<style scoped lang="scss"></style>
