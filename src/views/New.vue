<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="isLoading"
    v-model:active="isLoading"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div class="queue-page">
    <div v-if="!isBikeTagAmbassador && !pageLoading">
      <h2>Ambassador Access Required</h2>
      <p>You must be logged in as a BikeTag Ambassador to create a new round.</p>
      <bike-tag-button @click="router.push({ name: 'Dashboard' })">
        Go to Dashboard
      </bike-tag-button>
    </div>

    <div v-else-if="submitSuccess">
      A new BikeTag round for {{ getGameNameProper }} has been created!
      <bike-tag-button @click="router.push({ name: 'Home' })">
        Go to the Home Page
      </bike-tag-button>
    </div>

    <div v-else-if="!pageLoading">
      <h2>Start a New Round for {{ getGameNameProper }}</h2>
      <p class="round-number">Round #{{ newTag.tagnumber }}</p>
      <div class="biketag-container">
        <EditBikeTag :tag="newTag" allow-image-upload @update="onFieldUpdate" />
      </div>

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
      <input type="hidden" name="game" :value="getGameName" />
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
const pageLoading = ref(true)
const submitError = ref(null)

const isLoading = computed({
  get: () => submitInProgress.value || pageLoading.value,
  set: (value) => {
    if (!value) {
      submitInProgress.value = false
      pageLoading.value = false
    }
  },
})

const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)

const newTag = reactive({
  game: getGameName.value,
  tagnumber: null,
  playerId: '',
  foundPlayer: '',
  foundTime: 0,
  foundLocation: '',
  foundImageUrl: '',
  foundImage: null,
  mysteryPlayer: '',
  mysteryTime: 0,
  mysteryLocation: '',
  mysteryImageUrl: '',
  mysteryImage: null,
  hint: '',
})

async function onFieldUpdate({ field, value, tag }) {
  if (tag) {
    Object.assign(newTag, tag)
    return
  }
  if (field) {
    newTag[field] = value
  }
}

async function onSubmitClick() {
  if (!newTag.foundImage && !newTag.foundImageUrl) {
    toast.open({
      message: 'Please add a found image before submitting.',
      type: 'error',
      position: 'top',
    })
    return
  }
  if (!newTag.mysteryImage && !newTag.mysteryImageUrl) {
    toast.open({
      message: 'Please add a mystery image before submitting.',
      type: 'error',
      position: 'top',
    })
    return
  }
  if (!newTag.foundPlayer?.length || !newTag.mysteryPlayer?.length) {
    toast.open({
      message: 'Please enter player names before submitting.',
      type: 'error',
      position: 'top',
    })
    return
  }

  submitInProgress.value = true
  const errorFields = { game: getGameName.value }

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
        return sendNetlifyError(m, submitError.value, errorFields)
      },
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
    return sendNetlifyError(message, submitError.value, errorFields)
  }
}

onMounted(async () => {
  await store.isReady()
  await store.fetchPlayers()
  const currentTagnumber = store.getCurrentBikeTag?.tagnumber ?? 0
  newTag.game = getGameName.value
  newTag.tagnumber = currentTagnumber + 1
  pageLoading.value = false
})
</script>

<style scoped>
.biketag-container {
  max-width: clamp(80vw, 80vw, 500px);
  margin: auto;
}

.round-number {
  text-align: center;
  font-weight: bold;
  margin-bottom: 1rem;
}
</style>
