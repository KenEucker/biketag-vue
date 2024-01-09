<template>
  <div class="add-mystery-tag">
    <b-modal v-model="showModal" title="BootstrapVue" hide-footer hide-header>
      <img class="close-btn" src="@/assets/images/close.svg" @click="hideModal" />
      <h3 class="modal-header">
        {{ $t('You are ') }}{{ ordinalSuffixOf(numberInQueue) }}
        {{ $t('in the current round!') }}
      </h3>
      <bike-tag-button
        class="modal-sub-btn modal-sub-btn--big"
        variant="medium"
        :text="$t('components.queue.view_queue_button')"
        @click="goViewRound"
      />
    </b-modal>
    <!-- <h3 class="queue-title">{{ $t('pages.round.mystery_title') }}</h3> -->
    <div class="title-container">
      <bike-tag-button variant="medium" class="title-q" @click="$refs.file.click()">
        <h3 class="queue-title">{{ $t('components.queue.queue_mystery_title') }}</h3>
      </bike-tag-button>
    </div>
    <div class="preview-container">
      <template v-if="preview">
        <img class="img-bck" src="@/assets/images/transparent_img.png" alt="background" />
      </template>
      <img
        v-else
        class="img-bck click-me"
        src="@/assets/images/blank_img.svg"
        alt="image back"
        @click="$refs.file.click()"
      />
      <bike-tag-button
        :class="`click-me icn ${preview ? 'icn--top' : ''}`"
        variant="circle"
        @click="$refs.file.click()"
      >
        <img src="@/assets/images/camera.svg" alt="camera" />
      </bike-tag-button>
    </div>
    <div class="container biketag-tagit-form">
      <form
        ref="mysteryTagRef"
        name="add-mystery-tag"
        action="add-mystery-tag"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @keydown.enter="$event.preventDefault()"
        @submit.prevent="onSubmit"
      >
        <input type="hidden" name="form-name" value="add-mystery-tag" />
        <input type="hidden" name="playerId" :value="getPlayerId" />
        <input v-model="mysteryImageUrl" type="hidden" name="mysteryImageUrl" />
        <input
          id="file-upload"
          ref="file"
          type="file"
          class="d-none"
          accept="image/*"
          required
          @change="setImage"
        />
        <p class="queue-text">{{ $t('pages.round.mystery_text') }}</p>
        <div class="mt-3 mb-3 input-container">
          <bike-tag-input
            id="player"
            v-model="player"
            name="player"
            readonly
            :placeholder="$t('pages.round.name_placeholder')"
          />
          <bike-tag-input
            id="hint"
            v-model="hint"
            name="hint"
            :placeholder="$t('pages.round.hint_placeholder')"
          />
        </div>
        <!-- <div class="mt-3">
          <bike-tag-button
            variant="medium"
            :text="`${$t('pages.round.submit_new_tag')} ${$t('pages.round.queue_postfix')}`"
            @click="onSubmit"
          />
        </div> -->
        <bike-tag-button
          variant="medium"
          type="submit"
          :text="`${$t('pages.round.submit_new_tag')} ${$t('pages.round.queue_postfix')}`"
        />
      </form>
    </div>
  </div>
</template>

<script setup name="QueueMysteryTag">
import { ref, inject, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import { ordinalSuffixOf } from '@/common/utils'
import exifr from 'exifr'
import { useI18n } from 'vue-i18n'
// import heic2any from 'heic2any';

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'

// props
const props = defineProps({
  tag: {
    type: Object,
    default: () => {
      return {}
    },
  },
})

// data
const emit = defineEmits(['submit'])
const preview = ref(null)
const mysteryImageUrl = ref(null)
const confirmNoHint = ref(false)
const image = ref(props.tag?.mysteryImage)
const showModal = ref(false)
const noLongerNew = ref(false)
const hint = ref(props.tag?.hint ?? '')
const player = ref('')
const mysteryTagRef = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

// computed
const getGameName = computed(() => store.getGameName)
const getPlayerTag = computed(() => store.getPlayerTag)
const getPlayerId = computed(() => store.getPlayerId)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getQueuedTags = computed(() => store.getQueuedTags)
const numberInQueue = computed(() => {
  return getQueuedTags.value?.reduce((o, t, n) => {
    if (t.playerId === getPlayerTag.value?.playerId) {
      o = n + 1
    }
    return o
  }, 0)
})

// methods
function onSubmit(e) {
  e.preventDefault()
  if (!image.value) {
    toast.open({
      message: 'Invalid image, add a new one.',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }
  if (!hint.value.length && !confirmNoHint.value) {
    confirmNoHint.value = true
    toast.open({
      message: "You didn't add a hint, but it would sure be nice if you did.",
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }
  const formAction = mysteryTagRef.value.getAttribute('action')
  const formData = new FormData(mysteryTagRef.value)
  const mysteryTag = {
    mysteryImage: image.value,
    mysteryPlayer: player.value,
    hint: hint.value ?? '',
    tagnumber: getCurrentBikeTag.value?.tagnumber + 1 ?? 1,
    game: getGameName.value,
  }
  noLongerNew.value = true

  emit('submit', {
    formAction,
    formData,
    tag: mysteryTag,
    storeAction: 'addMysteryTag',
  })
}
const setImage = async (event) => {
  store.fetchCredentials()

  const input = event.target
  if (input.files) {
    try {
      const previewReader = new FileReader()
      previewReader.onload = (e) => {
        preview.value = e.target.result
        const bgImage = document.querySelector('.preview-container')
        bgImage.style.backgroundImage = `url(${e.target.result})`
      }
      previewReader.readAsDataURL(input.files[0])
      if (input.files[0].size / Math.pow(1024, 2) > 15) {
        toast.open({
          message: 'Image exceeds 15mb',
          type: 'error',
          duration: 10000,
          position: 'top',
        })
      } else {
        // const imageFile = input.files[0];
        image.value = input.files[0]

        // // Check if the file type is HEIC
        // if (imageFile.type === 'image/heic' || imageFile.name.toLowerCase().endsWith('.heic')) {
        //   try {
        //     const pngBlob = await heic2any({ blob: imageFile });
        //     const pngFile = new File([pngBlob], 'converted.png', { type: 'image/png' });
        //     image.value = pngFile;
        //   } catch (conversionError) {
        //     console.error('Error converting HEIC to PNG:', conversionError);
        //     toast.open({
        //       message: 'Error converting HEIC to PNG',
        //       type: 'error',
        //       position: 'top',
        //     });
        //     return;
        //   }
        // } else {
        //   // For non-HEIC files, proceed with the original image
        //   image.value = imageFile;
        // }
        const results = await exifr.parse(await input.files[0].arrayBuffer())
        const createDate = results?.CreateDate ?? results?.DateTimeOriginal ?? Date.now()

        if (createDate < getCurrentBikeTag.value.mysteryTime) {
          toast.open({
            message: 'Timestamp Error',
            type: 'error',
            duration: 10000,
            position: 'top',
          })
        } else {
          // const GPSData = await exifr.gps(await input.files[0].arrayBuffer())
          // if (GPSData) {
          //   if (GPSData.latitude != null && GPSData.longitude != null) {
          //     gps.value = {
          //       lat: Math.round(GPSData.latitude),
          //       lng: Math.round(GPSData.longitude),
          //     }
          //     isGpsDefault.value = false
          //   }
          // } else {
          //   gps.value = getGame.value?.boundary
          //   isGpsDefault.value = true
          // }
          // center.value = { ...gps.value }
          // location.value = ''
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}
function goViewRound() {
  hideModal()
  router.push('/round')
}
function showModalIfNew() {
  if (!getPlayerTag.value?.mysteryImageUrl?.length) {
    showModal.value = true
  }
}
function hideModal() {
  showModal.value = false
}

// mounted
onMounted(() => {
  player.value = getPlayerTag.value?.foundPlayer
  showModalIfNew()
})
</script>

<style lang="scss">
@import '../assets/styles/style';

.modal-header {
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  font-size: 2rem;
  font-family: $default-font-family;

  @media (width >= 470px) {
    font-size: 3rem;
  }
}

.modal-sub-btn {
  width: 70%;
  margin: 1rem auto;
  display: flex;
  justify-content: center;
  align-items: center;

  &--big {
    width: 90%;
  }
}

.close-btn,
.go-queue {
  cursor: pointer;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
}
</style>
