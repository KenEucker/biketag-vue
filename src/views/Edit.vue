<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="editInProgress"
    v-model:active="editInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div class="queue-page">
    <div v-if="editSuccess">
      The most recent BikeTag from {{ getGameNameProper }} has been updated!
      <bike-tag-button @click="router.push({ name: 'Home' })">
        Go to the Home Page
      </bike-tag-button>
    </div>

    <div v-else-if="!editInProgress && currentTag">
      <h2>Edit Most Recent BikeTag for {{ getGameNameProper }}</h2>
      <EditBikeTag :tag="currentTag" @update="onFieldUpdate" />
      <bike-tag-button @click="onSave">
        Save Changes
      </bike-tag-button>
    </div>

    <div v-else class="loading-message">
      <p>Loading the latest BikeTag for editing...</p>
    </div>

    <form
      ref="editError"
      name="edit-tag-error"
      action="edit-tag-error"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      hidden
    >
      <input type="hidden" name="form-name" value="edit-tag-error" />
      <input type="hidden" name="tagnumber" :value="currentTag?.tagnumber" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <input type="hidden" name="message" />
      <input type="hidden" name="ip" value="" />
    </form>
  </div>
</template>

<script setup name="EditView">
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { sendNetlifyError, sendNetlifyForm } from '@/common'
import BikeTagButton from '@/components/BikeTagButton.vue'
import EditBikeTag from '@/components/EditBikeTag.vue'

const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

const editInProgress = ref(true)
const editSuccess = ref(false)
const editError = ref(null)

const pendingEdits = reactive({})

const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)
const currentTag = computed(() => store.getCurrentBikeTag)

async function onFieldUpdate({ field, value }) {
  pendingEdits[field] = value
}

async function onSave() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message: 'Saving edits...',
    type: 'info',
    position: 'top'
  })

  const errorAction = editError.value.getAttribute('action')

  editInProgress.value = true

  const payload = {
    game: getGameName.value,
    tagnumber: currentTag.value.tagnumber,
    ...pendingEdits
  }

  const result = await store.updateCurrentTag(payload)
  editInProgress.value = false

  if (result === true) {
    store.fetchQueuedTags(false)
    return sendNetlifyForm(
      'edit-tag-success',
      `game=${getGameName.value}`,
      () => {
        toast.open({
          message: 'Edit successful!',
          type: 'success',
          position: 'top'
        })
        editSuccess.value = true
        store.resetBikeTagCache()
      },
      (m) => {
        toast.open({
          message: `${t('notifications.error')} ${m}`,
          type: 'error',
          duration: 10000,
          timeout: false,
          position: 'bottom'
        })
        return sendNetlifyError(m, undefined, errorAction)
      }
    )
  } else {
    const message = `Error saving edit: ${result}`
    toast.open({
      message,
      type: 'error',
      duration: 10000,
      timeout: false,
      position: 'bottom'
    })
    return sendNetlifyError(message, undefined, errorAction)
  }
}

onMounted(async () => {
  await store.isReady()
  editInProgress.value = false
})
</script>
