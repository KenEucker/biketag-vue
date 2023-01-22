<template>
  <div class="queue-page">
    <div v-if="usingTimer && isViewingQueue()" class="mt-2 clock-div">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <div class="container round-page-description">
      <p v-if="getQueuedTags?.length">
        {{ $t('pages.round.current_round_description') }}
        <br />
        <br />
        {{ $t('pages.round.current_round_win_description') }}
      </p>
      <p v-else>
        {{ $t('pages.round.current_round_description_empty') }}
      </p>
    </div>
    <span class="tag-number"
      >#{{
        getCurrentBikeTag?.tagnumber + (getFormStep > BiketagFormSteps.addFoundImage ? 1 : 0)
      }}</span
    >
    <div>
      <queue-view />
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
// watchEffect, onMounted } from 'vue'
// import { mapGetters } from 'vuex'
import { useStore } from '@/store/pinia.ts'
import { storeToRefs } from 'pinia'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'

import QueueView from '@/components/QueueView.vue'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueView,
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
    store() {
      return useStore()
    },
    getFormStep() {
      const { getFormStep } = storeToRefs(this.store)

      return getFormStep
    },
    getPlayerTag() {
      const { getPlayerTag } = storeToRefs(this.store)

      return getPlayerTag
    },
    getCurrentBikeTag() {
      const { getCurrentBikeTag } = storeToRefs(this.store)

      return getCurrentBikeTag
    },
    getGameName() {
      const { getGameName } = storeToRefs(this.store)

      return getGameName
    },
    getQueuedTags() {
      const { getQueuedTags } = storeToRefs(this.store)

      return getQueuedTags
    },
    getPlayerId() {
      const { getPlayerId } = storeToRefs(this.store)

      return getPlayerId
    },
    // ...mapGetters([
    //   'getFormStep',
    //   'getPlayerTag',
    //   'getCurrentBikeTag',
    //   'getGameName',
    //   'getQueuedTags',
    //   'getPlayerId',
    // ]),
  },
  async mounted() {
    this.uploadInProgress = false
  },
  async created() {
    await this.$store.dispatch('setCurrentBikeTag', true)
    await this.$store.dispatch('setQueuedTags', true)
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
    isSubmittingData() {
      return (
        !this.isViewingQueue() &&
        !(
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.roundJoined] ||
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.roundPosted] ||
          this.getFormStep === BiketagFormSteps[BiketagFormSteps.shareBikeTagPost]
        )
      )
    },
    isViewingQueue() {
      return this.getFormStep === BiketagFormSteps[BiketagFormSteps.viewRound]
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

.round-page-description {
  font-family: $default-font-family;
  text-transform: uppercase;
}

.realign-spinner {
  margin-left: -15%;
  @media (min-width: 620px) {
    margin-left: 0;
  }
}
</style>
