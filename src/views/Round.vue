<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="queue-page">
    <div v-if="props.usingTimer && isViewingQueue()" class="mt-2 clock-div">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <div class="container round-page-description">
      <p v-if="getQueuedTags?.length">
        {{ t('pages.round.current_round_description') }}
        <br />
        <br />
        {{ t('pages.round.current_round_win_description') }}
      </p>
      <p v-else>
        {{ t('pages.round.current_round_description_empty') }}
      </p>
    </div>
    <span class="tag-number">
      #{{ getCurrentBikeTag?.tagnumber + (getFormStep > BiketagFormSteps.addFoundImage ? 1 : 0) }}
    </span>
    <div>
      <queue-view />
    </div>
  </div>
</template>

<script setup name="QueueBikeTagView">
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/store/index.ts'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
// import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'

// components
import QueueView from '@/components/QueueView.vue'
import { useI18n } from 'vue-i18n'

// props
const props = defineProps({
  usingTimer: {
    type: Boolean,
    default: false,
  },
})

// data
// const countDown = ref(10)
// const queueError = ref(null)
// const toast = inject('toast')
const time = new Date()
time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
const timer = ref(useTimer(time.getSeconds()))
const uploadInProgress = ref(false)
const store = useStore()
const { t } = useI18n()

// computed
// const getPlayerTag = computed(() => store.getPlayerTag)
// const getGameName = computed(() => store.getGameName)
const getFormStep = computed(() => store.getFormStep)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getQueuedTags = computed(() => store.getQueuedTags)

// methods
// function countDownTimer() {
//   if (countDown.value > 0) {
//     setTimeout(() => {
//       countDown.value -= 1
//       countDownTimer()
//     }, 500)
//   }
// }
// function isSubmittingData() {
//   return (
//     !isViewingQueue() &&
//     !(
//       getFormStep.value === BiketagFormSteps[BiketagFormSteps.roundJoined] ||
//       getFormStep.value === BiketagFormSteps[BiketagFormSteps.roundPosted] ||
//       getFormStep.value === BiketagFormSteps[BiketagFormSteps.shareBikeTagPost]
//     )
//   )
// }
// async function onQueueSubmit(newTagSubmission) {
//   const { tag, formAction, formData, storeAction } = newTagSubmission
//   if ('scrollRestoration' in history) {
//     history.scrollRestoration = 'manual'
//   }
//   window.scrollTo(0, 0)

//   toast.open({
//     message: t('notifications.uploading'),
//     type: 'info',
//     position: 'top',
//   })
//   const errorAction = queueError.value.getAttribute('action')

//   uploadInProgress.value = true
//   const success = await store[storeAction](tag)
//   uploadInProgress.value = false

//   if (success === true) {
//     /// Get a clean cache
//     await store.setTags(true)
//     /// Update the queue
//     store.setQueuedTags(true)

//     formData.set('game', getGameName.value)
//     formData.set('tag', JSON.stringify(getPlayerTag.value))
//     formData.set(
//       'submission',
//       `${getGameName.value}-${getPlayerTag.value.tagnumber}--${getPlayerTag.value.foundPlayer}`
//     )

//     if (tag.foundImage) {
//       formData.set('foundImageUrl', getPlayerTag.value.foundImageUrl)
//     } else if (tag.mysteryImage) {
//       formData.set('mysteryImageUrl', getPlayerTag.value.mysteryImageUrl)
//     }
//     return sendNetlifyForm(
//       formAction,
//       new URLSearchParams(formData).toString(),
//       () => {
//         toast.open({
//           message: `${storeAction} ${t('notifications.success')}`,
//           type: 'success',
//           position: 'top',
//         })
//       },
//       (m) => {
//         toast.open({
//           message: `${t('notifications.error')} ${m}`,
//           type: 'error',
//           timeout: false,
//           position: 'bottom',
//         })
//         return sendNetlifyError(m, undefined, errorAction)
//       }
//     )
//   } else {
//     const message = `${t('notifications.error')}: ${success}`
//     toast.open({
//       message,
//       type: 'error',
//       timeout: false,
//       position: 'bottom',
//     })
//     return sendNetlifyError(message, undefined, errorAction)
//   }
// }
function isViewingQueue() {
  return getFormStep.value === BiketagFormSteps[BiketagFormSteps.viewRound]
}

// created
const created = async () => {
  await store.setCurrentBikeTag(true)
  await store.setQueuedTags(true)
  // countDownTimer()
}
created()

// mounted
onMounted(() => {
  uploadInProgress.value = false
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
