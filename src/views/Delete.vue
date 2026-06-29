<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="deleteInProgress"
    v-model:active="deleteInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>
  <div class="queue-page">
    <div v-if="deleteSuccess">
      The most recent BikeTag from {{ getGameNameProper }} has been deleted!
      <bike-tag-button @click="router.push({ name: 'Home' })">
        Go to the Home Page
      </bike-tag-button>
    </div>
    <delete-bike-tag v-else-if="!deleteInProgress" @submit="onDeleteSubmit" />
    <div v-else class="loading-message">
      <p>Deleting the last BikeTag...</p>
    </div>
    <form
      ref="queueError"
      name="delete-tag-error"
      action="delete-tag-error"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      hidden
    >
      <input type="hidden" name="form-name" value="delete-tag-error" />
      <input type="hidden" name="tagnumber" :value="getCurrentBikeTag.tagnumber" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <input type="hidden" name="game" :value="getGameName" />
      <input type="hidden" name="message" />
      <input type="hidden" name="ip" value="" />
    </form>
  </div>
</template>

<script setup name="DeleteView">
import { sendNetlifyError, sendNetlifyForm } from '@/common'
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import DeleteBikeTag from '@/components/DeleteBikeTag.vue'
import { useI18n } from 'vue-i18n'
import Loading from 'vue-loading-overlay'

// data
const deleteInProgress = ref(false)
const deleteSuccess = ref(false)
const queueError = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)

// methods
async function onDeleteSubmit() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message: t('notifications.deleting'),
    type: 'info',
    position: 'top',
  })
  const errorFields = { game: getGameName.value }

  deleteInProgress.value = true
  const result = await store.deleteCurrentTag(getCurrentBikeTag.value)
  deleteInProgress.value = false

  if (result === true) {
    store.fetchQueuedTags(false)
    return sendNetlifyForm(
      'delete-tag-success',
      `game=${getGameName.value}`,
      () => {
        toast.open({
          message: `${t('notifications.delete-success')}`,
          type: 'success',
          position: 'top',
        })
        deleteSuccess.value = true
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
        return sendNetlifyError(m, queueError.value, errorFields)
      },
    )
  } else {
    const message = `${t('notifications.error')}: ${result}`
    toast.open({
      message,
      type: 'error',
      duration: 10000,
      timeout: false,
      position: 'bottom',
    })
    return sendNetlifyError(message, queueError.value, errorFields)
  }
}

// mounted
onMounted(async () => {
  await store.isReady()
  deleteInProgress.value = false
})
</script>
