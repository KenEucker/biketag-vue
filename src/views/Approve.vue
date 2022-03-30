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
    <queue-approve v-if="!uploadInProgress" @submit="onApproveSubmit" />
    <div v-else class="loading-message">
      <p>The next BikeTag Round is loading!</p>
    </div>
    <form
      ref="queueError"
      name="approve-tag-error"
      action="approve-tag-error"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      hidden
    >
      <input type="hidden" name="form-name" value="post-tag-error" />
      <input type="hidden" name="submission" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <input type="hidden" name="message" />
      <input type="hidden" name="ip" value="" />
    </form>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
// watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'
import QueueApprove from '@/components/QueueApprove.vue'
import { debug } from '@/common/utils'

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
    // onMounted(() => {
    //   watchEffect(async () => {
    //     if (timer.isExpired.value) {
    //       console.warn('IsExpired')
    //     }
    //   })
    // })
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
      'getPlayerTag',
      'getCurrentBikeTag',
      'getGameName',
      'getAmbassadorId',
    ]),
  },
  async mounted() {
    await this.$store.dispatch('setQueuedTags', true)
    await this.$store.dispatch('fetchCredentials')

    /// Get the user credentials for BikeTag Ambassador functions
    await setTimeout(() => {
      if (!this.checkAuth()) {
        setTimeout(() => this.checkAuth, 1000)
      }
    }, 1000)
    this.uploadInProgress = false
  },
  async created() {
    // this.countDownTimer()
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
    async checkAuth() {
      if (this.$auth.isAuthenticated) {
        if (!this.getProfile?.nonce?.length) {
          return this.$auth.getIdTokenClaims().then((claims) => {
            if (claims) {
              const token = claims.__raw
              this.$store.dispatch('setProfile', { ...this.$auth.user, token })
              return true
            } else {
              debug('BikeTag Ambassador profile could not be authenticated')
              return false
            }
          })
        }
        return true
      }
      return false
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

      const claims = await this.$auth.getIdTokenClaims()
      if (claims) {
        /// If no token, the request will be rejected
        tag.token = claims.__raw
      }

      this.uploadInProgress = true
      const success = await this.$store.dispatch(storeAction, tag)
      this.uploadInProgress = false

      if (success === true) {
        /// Update the queue
        this.$store.dispatch('setQueuedTags', true)

        formData.set('game', this.getGameName)
        formData.set('tag', JSON.stringify(this.getPlayerTag))
        formData.set(
          'approve',
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
            this.$notifications.send(
              this.$t(`notifications.${storeAction}`),
              storeAction,
              this.getPlayerTag.foundPlayer
            )
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
<style lang="scss" scoped>
@import '../assets/styles/style';

.loading-message {
  p {
    font-family: $default-font-family;
    text-transform: uppercase;
  }
}
</style>
