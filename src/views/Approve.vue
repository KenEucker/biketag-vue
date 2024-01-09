<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="uploadInProgress"
    v-model:active="uploadInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>
  <div class="queue-page">
    <div v-if="approveSuccess">
      You successfully posted a new round of BikeTag {{ getGameNameProper }}!
      <bike-tag-button @click="router.push('/')"> Go to the Home Page </bike-tag-button>
    </div>
    <queue-approve v-else-if="!uploadInProgress" @submit="onApproveSubmit" />
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

<script setup name="ApproveBikeTagView">
import { ref, inject, computed, onMounted } from 'vue'
import { useBikeTagStore } from '@/store/index'
// import { useTimer } from 'vue-timer-hook'
import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'
import { useAuth0 } from '@auth0/auth0-vue'
import { useRouter } from 'vue-router'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import QueueApprove from '@/components/QueueApprove.vue'
import { useI18n } from 'vue-i18n'

// props
const props = defineProps({
  usingTimer: {
    type: Boolean,
    default: false,
  },
})

// data
const time = new Date()
time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
// const timer = ref(useTimer(time))
const uploadInProgress = ref(false)
const approveSuccess = ref(false)
const { idTokenClaims } = useAuth0()
const queueError = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getPlayerTag = computed(() => store.getPlayerTag)
const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)

// methods
async function onApproveSubmit(newTagSubmission) {
  const { tag, formAction, formData, storeAction } = newTagSubmission
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message:
      storeAction.indexOf('approve') !== -1
        ? t('notifications.approving')
        : t('notifications.removing'),
    type: 'info',
    position: 'top',
  })
  const errorAction = queueError.value.getAttribute('action')

  const claims = idTokenClaims.value
  if (claims) {
    /// If no token, the request will be rejected
    tag.token = claims.__raw
  }

  uploadInProgress.value = true
  const success = await store[storeAction](tag)
  uploadInProgress.value = false

  if (success === true) {
    /// Update the queue
    store.fetchQueuedTags(true)

    formData.set('game', getGameName.value)
    formData.set('tag', JSON.stringify(getPlayerTag.value))
    formData.set(
      'approve',
      `${getGameName.value}-${getPlayerTag.value.tagnumber}--${getPlayerTag.value.foundPlayer}`,
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
        toast.open({
          message: `${storeAction} ${t('notifications.success')}`,
          type: 'success',
          position: 'top',
        })
        approveSuccess.value = true
        store.resetBikeTagCache()
      },
      (m) => {
        toast.open({
          message: `${t('notifications.error')} ${m}`,
          type: 'error',
          duration: 10000,
          timeout: false,
          position: 'bottom',
        })
        return sendNetlifyError(m, undefined, errorAction)
      },
    )
  } else {
    const message = `${t('notifications.error')}: ${success}`
    toast.open({
      message,
      type: 'error',
      duration: 10000,
      timeout: false,
      position: 'bottom',
    })
    return sendNetlifyError(message, undefined, errorAction)
  }
}

// mounted
onMounted(async () => {
  await store.fetchQueuedTags(true)
  await store.fetchCredentials()

  /// TODO: do we need to?
  // /// Get the user credentials for BikeTag Ambassador functions
  // checkAuth(useAuth0(), (user, tokens) => {
  //   if (!store.getProfile?.nonce?.length) {
  //     store.setProfile({ ...user.value, token: tokens?.__raw })
  //   }
  // })
  uploadInProgress.value = false

  // watchEffect(async () => {
  //   if (timer.value.isExpired.valueof) {
  //     console.warn('IsExpired')
  //   }
  // })
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
