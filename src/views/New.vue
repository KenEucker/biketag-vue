<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="submitInProgress"
    v-model:active="submitInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div class="queue-page">
    <div v-if="submitSuccess">
      A new BikeTag round for {{ getGameNameProper }} has been created!
      <bike-tag-button @click="router.push({ name: 'Home' })">
        Go to the Home Page
      </bike-tag-button>
    </div>

    <div v-else>
      <h2>Start a New Round for {{ getGameNameProper }}</h2>

      <EditBikeTag :tag="newTag" @update="onFieldUpdate" />

      <bike-tag-button variant="light" class="big-btn" @click="onSubmitClick">
        Submit New Round
      </bike-tag-button>
    </div>

    <form
      ref="submitError"
      name="new-round-error"
      action="new-round-error"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      hidden
    >
      <input type="hidden" name="form-name" value="new-round-error" />
      <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
      <input type="hidden" name="message" />
      <input type="hidden" name="ip" value="" />
    </form>
  </div>
</template>

<script setup name="NewRound">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { sendNetlifyError, sendNetlifyForm } from '@/common'
import { useBikeTagStore } from '@/store/index'

import BikeTagButton from '@/components/BikeTagButton.vue'
import EditBikeTag from '@/components/EditBikeTag.vue'
import Loading from 'vue-loading-overlay'

const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

const submitInProgress = ref(false)
const submitSuccess = ref(false)
const submitError = ref(null)

const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)

const newTag = reactive({
  game: getGameName.value,
  tagnumber: null,
  foundPlayer: '',
  foundTime: 0,
  foundLocation: '',
  foundImageUrl: '',
  mysteryPlayer: '',
  mysteryTime: 0,
  mysteryLocation: '',
  mysteryImageUrl: '',
  hint: '',
})

async function onFieldUpdate({ field, value }) {
  newTag[field] = value
}

async function onSubmitClick() {
  submitInProgress.value = true
  const errorAction = submitError.value.getAttribute('action')

  const result = await store.createNewRoundTag(newTag)
  submitInProgress.value = false

  if (result === true) {
    store.resetBikeTagCache()
    return sendNetlifyForm(
      'new-round-success',
      `game=${getGameName.value}`,
      () => {
        toast.open({
          message: 'New round submitted!',
          type: 'success',
          position: 'top',
        })
        submitSuccess.value = true
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
      }
    )
  } else {
    const message = `Error creating new round: ${result}`
    toast.open({
      message,
      type: 'error',
      duration: 10000,
      timeout: false,
      position: 'bottom',
    })
    console.error(message)
    return sendNetlifyError(message, undefined, errorAction)
  }
}

onMounted(async () => {
  await store.isReady()
  newTag.tagnumber = store.getCurrentBikeTag?.tagnumber ?? 1
})
</script>

<style scoped>
.biketag-container {
  max-width: clamp(80vw, 80vw, 500px);
  margin: auto;
}
</style>
