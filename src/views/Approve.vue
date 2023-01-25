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
import { ref, computed } from 'vue'
// watchEffect, onMounted } from 'vue'
import { useStore } from '@/store/index.ts'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'
import QueueApprove from '@/components/QueueApprove.vue'
import { debug } from '@/common/utils'

export default {
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
  setup() {
    const time = new Date()
    time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
    const store = useStore()
    const timer = ref(useTimer(time))
    const uploadInProgress = ref(false)
    let countDown = ref(10)

    // computed
    const getPlayerTag = computed(() => store.getPlayerTag)
    const getGameName = computed(() => store.getGameName)
    const getAmbassadorId = computed(() => store.getAmbassadorId)

    // methods
    async function checkAuth() {
      if (this.$auth?.isAuthenticated) {
        if (!store.getProfile?.nonce?.length) {
          return this.$auth.getIdTokenClaims().then((claims) => {
            if (claims) {
              const token = claims.__raw
              store.setProfile({ ...this.$auth.user, token })
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
    }
    async function onApproveSubmit(newTagSubmission) {
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
      const success = await store.dispatch(storeAction, tag)
      this.uploadInProgress = false

      if (success === true) {
        /// Update the queue
        store.setQueuedTags(true)

        formData.set('game', getGameName.value)
        formData.set('tag', JSON.stringify(getPlayerTag.value))
        formData.set(
          'approve',
          `${getGameName.value}-${getPlayerTag.value.tagnumber}--${getPlayerTag.value.foundPlayer}`
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
            this.$toast.open({
              message: `${storeAction} ${this.$t('notifications.success')}`,
              type: 'success',
              position: 'top',
            })
            store.setQueuedTags()
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
    }

    return {
      timer,
      uploadInProgress,
      countDown,
      checkAuth,
      onApproveSubmit,
      getAmbassadorId,
      store,
    }
  },
  async mounted() {
    await this.store.setQueuedTags(true)
    await this.store.fetchCredentials()

    /// Get the user credentials for BikeTag Ambassador functions
    setTimeout(() => {
      if (!this.checkAuth()) {
        setTimeout(() => this.checkAuth, 1000)
      }
    }, 1000)
    this.uploadInProgress = false
  },
}
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
