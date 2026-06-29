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
  <b-modal
    v-model="confirmEdit"
    class="confirm-modal"
    title="Confirm Edit of Current Bike Tag"
    @ok="doSave"
  >
    <p>{{ $t('pages.edit.confirm_edit') }}</p>
  </b-modal>

  <div class="queue-page">
    <div v-if="editSuccess">
      The most recent BikeTag from {{ getGameNameProper }} has been updated!
      <bike-tag-button @click="router.push({ name: 'Home' })">
        Go to the Home Page
      </bike-tag-button>
    </div>

    <div v-else-if="!editInProgress && mergedTag">
      <h2>Edit Most Recent BikeTag for {{ getGameNameProper }}</h2>

      <!-- Toggle preview/edit mode -->
      <bike-tag-button @click="togglePreview">
        {{ previewMode ? 'Switch to Edit Mode' : 'Switch to Preview Mode' }}
      </bike-tag-button>

      <div class="biketag-container">
        <BikeTag
          v-if="previewMode"
          :tag="mergedTag"
          :found-tagnumber="mergedTag?.tagnumber - 1"
          :found-description="mergedTag?.foundLocation"
        />
        <EditBikeTag v-else :tag="mergedTag" @update="onFieldUpdate" />
      </div>

      <bike-tag-button variant="light" class="big-btn" @click="onSaveClick"
        >Save Changes</bike-tag-button
      >
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
      <input type="hidden" name="tagnumber" :value="mergedTag?.tagnumber" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <input type="hidden" name="game" :value="getGameName" />
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
import BikeTag from '@/components/BikeTag.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import EditBikeTag from '@/components/EditBikeTag.vue'
import Loading from 'vue-loading-overlay'

const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

const editInProgress = ref(true)
const editSuccess = ref(false)
const editError = ref(null)
const confirmEdit = ref(false)
const previewMode = ref(false)

const pendingEdits = reactive({})
const mergedTag = reactive({})

const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)
const currentTag = computed(() => store.getCurrentBikeTag)
const previousTag = computed(() => store.getPreviousBikeTag)

function togglePreview() {
  previewMode.value = !previewMode.value
}

function mergeTags(forward = true) {
  if (forward) {
    if (currentTag.value && previousTag.value) {
      Object.assign(mergedTag, {
        ...currentTag.value,
        foundPlayer: previousTag.value.foundPlayer,
        foundTime: previousTag.value.foundTime,
        foundLocation: previousTag.value.foundLocation,
        foundImageUrl: previousTag.value.foundImageUrl,
      })
    } else {
      console.log('issue merging current and previous tags', {
        currentTag: currentTag.value,
        previousTag: previousTag.value,
      })
    }
  } else {
    return {
      currentTag: {
        ...currentTag.value,
        foundPlayer: pendingEdits.foundPlayer,
        foundTime: pendingEdits.foundTime,
        foundLocation: pendingEdits.foundLocation,
        foundImageUrl: pendingEdits.foundImageUrl,
      },
      previousTag: {
        ...previousTag.value,
        mysteryPlayer: pendingEdits.mysteryPlayer,
        mysteryTime: pendingEdits.mysteryTime,
        mysteryLocation: pendingEdits.mysteryLocation,
        mysteryImageUrl: pendingEdits.mysteryImageUrl,
      },
    }
  }
}

async function onFieldUpdate({ field, value, tag }) {
  if (tag) {
    Object.assign(mergedTag, tag)
    Object.assign(pendingEdits, tag)
    return
  }
  pendingEdits[field] = value
  mergedTag[field] = value // update mergedTag so preview reflects changes live
}

async function onSaveClick() {
  confirmEdit.value = true
}

async function doSave() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  toast.open({
    message: 'Saving edits...',
    type: 'info',
    position: 'top',
  })

  const errorFields = { game: getGameName.value }

  editInProgress.value = true

  const updatePayloads = mergeTags(false)

  const currentUpdateResult = await store.updateCurrentTag(updatePayloads.currentTag)
  const previousUpdateResult = await store.updateCurrentTag(updatePayloads.previousTag)
  editInProgress.value = false

  if (currentUpdateResult === true && previousUpdateResult === true) {
    store.fetchQueuedTags(false)
    return sendNetlifyForm(
      'edit-tag-success',
      `game=${getGameName.value}`,
      () => {
        toast.open({
          message: 'Edit successful!',
          type: 'success',
          position: 'top',
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
          position: 'bottom',
        })
        return sendNetlifyError(m, editError.value, errorFields)
      },
    )
  } else {
    const message = `Error saving edits for${currentUpdateResult !== true ? ' current' : ''}${previousUpdateResult !== true ? ' previous' : ''}`
    toast.open({
      message,
      type: 'error',
      duration: 10000,
      timeout: false,
      position: 'bottom',
    })
    console.error(message, {
      currentUpdateResult,
      previousUpdateResult,
    })
    return sendNetlifyError(message, editError.value, errorFields)
  }
}

onMounted(async () => {
  await store.isReady()
  mergeTags()
  editInProgress.value = false
})
</script>

<style scoped>
.biketag-container {
  max-width: clamp(80vw, 80vw, 500px);
  margin: auto;
}
</style>
