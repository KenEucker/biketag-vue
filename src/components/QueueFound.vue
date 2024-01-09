<template>
  <loading v-show="uploadInProgress" v-model:active="uploadInProgress" class="realign-spinner">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
  </loading>
  <b-modal v-model="showModal" title="Authenticate" hide-footer hide-header>
    <img class="close-btn" src="@/assets/images/close.svg" @click="hideModal" />
    <form @submit.prevent="onSubmit">
      <div>
        <p>{{ t('pages.round.player_name_reserved') }}</p>
        <bike-tag-input id="passcode" v-model="passcode" name="passcode" placeholder="passcode" />
        <bike-tag-button class="modal-sub-btn" variant="medium" text="Submit" />
      </div>
    </form>
  </b-modal>
  <div :class="`add-found-tag ${uploadInProgress ? 'hidden' : ''}`">
    <div class="title-container">
      <bike-tag-button variant="medium" @click="$refs.file.click()">
        <h3 class="queue-title">{{ t('pages.round.found_title') }}</h3>
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
        alt="image-back"
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
    <form
      ref="foundTagRef"
      name="add-found-tag"
      action="add-found-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      @keydown.enter="$event.preventDefault()"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="add-found-tag" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <input v-model="foundImageUrl" type="hidden" name="foundImageUrl" />
      <input
        id="file-upload"
        ref="file"
        type="file"
        class="d-none"
        accept="image/*"
        required
        @change="setImage"
      />
      <p class="queue-text">{{ t('pages.round.found_text') }}</p>
      <div class="mt-3 mb-3 input-container">
        <bike-tag-input
          id="found"
          :disabled="locationDisabled"
          name="found"
          required
          :placeholder="t('pages.round.location_placeholder')"
        >
          <img :src="pinIcon" alt="pin" />
          <GMapAutocomplete
            v-if="isGmapsEnabled() && isGpsDefault"
            id="google-input"
            :disabled="locationDisabled"
            @input="changeLocation"
            @blur="changeLocation"
            @click="changeLocation"
            @place_changed="setPlace"
          />
          <input
            v-else
            id="google-input"
            v-model="location"
            :disabled="locationDisabled"
            class="pac-target-input"
            placeholder="Enter a location"
          />
        </bike-tag-input>
        <b-popover target="found" :show="showPopover" triggers="click" placement="top">
          <template #title> Location: {{ getLocation }} </template>
          <p v-if="locationDisabled">{{ t('pages.round.image_first') }}</p>
          <bike-tag-map
            variant="play/input"
            :gps="isGps ? gps : getGame?.boundary?.lat ? getGame?.boundary : undefined"
            :start="center"
            @dragend="updateMarker"
          />
        </b-popover>
        <bike-tag-input
          id="player"
          v-model="player"
          name="player"
          required
          :readonly="isAuthenticated"
          :placeholder="t('pages.round.name_placeholder')"
        />
        <b-modal
          v-model="confirmInBoundary"
          class="confirm-modal"
          :title="t('pages.round.location_oustide_boundary_alert.title')"
          @ok="confirmedBoundary = true"
        >
          <p>{{ t('pages.round.location_oustide_boundary_alert.body') }}</p>
        </b-modal>
        <b-modal
          v-model="confirmNoGPS"
          class="confirm-modal"
          :title="t('pages.round.missing_gps_alert.title')"
          @ok="confirmedNoGPS = true"
        >
          <p>{{ t('pages.round.missing_gps_alert.body') }}</p>
        </b-modal>
      </div>
      <div class="sub-container">
        <bike-tag-button
          variant="medium"
          type="submit"
          :text="t('pages.round.queue_found_tag')"
          @click="onSubmit"
        />
      </div>
    </form>
  </div>
</template>

<script setup name="QueueFoundTag">
import { ref, inject, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { useAuth0 } from '@auth0/auth0-vue'
import { debug, isPointInPolygon, isAuthenticationEnabled, isGmapsEnabled } from '@/common/utils'
import { useI18n } from 'vue-i18n'
import exifr from 'exifr'
import Pin from '@/assets/images/pin.svg'
// import heic2any from 'heic2any';

// components
import Loading from 'vue-loading-overlay'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'

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
const pinIcon = Pin
const emit = defineEmits(['submit'])
const preview = ref(null)
const image = ref(props.tag?.foundImage ?? '')
const foundImageUrl = ref(null)
const locationDisabled = ref(true)
const center = ref({ lat: 0, lng: 0 })
const gps = ref({ lat: null, lng: null })
const isGpsDefault = ref(true)
const showPopover = ref(false)
const inputDOM = ref(null)
const showModal = ref(false)
const uploadInProgress = ref(false)
const location = ref('')
const player = ref('')
const passcode = ref(Date.now().toString()) // don't let them just get away with it
const foundTagRef = ref(null)
const store = useBikeTagStore()
const toast = inject('toast')
const { t } = useI18n()
const boundary = ref({})
const isInBoundary = ref(false)
const confirmNoGPS = ref(false)
const confirmedNoGPS = ref(false)
const confirmInBoundary = ref(false)
const confirmedBoundary = ref(false)
let auth0 = isAuthenticationEnabled() ? useAuth0() : undefined

// computed
const isAuthenticated = computed(() => (auth0 ? auth0.isAuthenticated.value : false))
const getGameName = computed(() => store.getGameName)
const getPlayerId = computed(() => store.getPlayerId)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getGame = computed(() => store.getGame)
const getPlayerName = computed(() => store.getPlayerName ?? props.tag?.foundPlayer ?? '')
const isGps = computed(() => gps.value.lat && gps.value.lng)
const getLocation = computed(() => {
  if (location.value.length > 0) {
    return location.value
  } else if (isGps.value) {
    return `${gps.value.lat}, ${gps.value.lng}`
  }

  return location.value
})

// methods
const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
const hideModal = () => (showModal.value = false)
const onSubmit = async (e) => {
  e.preventDefault()
  uploadInProgress.value = true
  const gpsIsDefault =
    gps.value.lat === getGame.value?.boundary.lat && gps.value.lng === getGame.value?.boundary.lng

  /// Attempts to fix the tagnumber === #NaN issue
  if (!getCurrentBikeTag?.tagnumber) {
    await store.fetchTags()
    await store.fetchCurrentBikeTag()
    await store.fetchQueuedTags()
  }

  if (!location.value?.length) {
    toast.open({
      message: 'Please add a Found Location description',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    uploadInProgress.value = false
    return
  } else if (confirmedNoGPS.value === false && gpsIsDefault) {
    confirmNoGPS.value = true
    confirmedNoGPS.value = true
    uploadInProgress.value = false
    return
  }

  if (calculateInBoundary()) {
    toast.open({
      message: 'That location is outside of the game boundaries.',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    uploadInProgress.value = false
    return
  }

  if (!player.value) {
    toast.open({
      message: 'Please enter a name',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    uploadInProgress.value = false
    return
  }

  /// TODO: watch this?
  if (!isAuthenticated.value) {
    // console.log('player', player.value)
    try {
      const passcodeCheckResponse = await store.checkPasscode({
        name: player.value,
        passcode: passcode.value,
      })
      // console.log({ passcodeCheckResponse })
      showModal.value = false
      await sleep(100)
    } catch (e) {
      // console.log('response', e.response)
      const noProfileFound = e.response.status === 404 && e.response.data === 'no profile found'
      const incorrectPasscode = e.response.status === 401

      if (noProfileFound) {
        /// All good
        console.log('no profile found')
      } else if (showModal.value) {
        toast.open({
          message: 'Incorrect passcode',
          type: 'error',
          duration: 10000,
          position: 'top',
        })
        nextTick(() => (showModal.value = !showModal.value))
        passcode.value = ''
        uploadInProgress.value = false
        return
      } else {
        if (incorrectPasscode) {
          nextTick(() => (showModal.value = !showModal.value))
          passcode.value = ''
          uploadInProgress.value = false
          return
        }
      }
    }
  }
  if (!image.value) {
    toast.open({
      message: 'Invalid image, add a new one.',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    uploadInProgress.value = false
    return
  }
  if (location.value?.length == 0) {
    if (!gps.value.lat) {
      debug('location must be set')
      uploadInProgress.value = false
      return
    }
  }
  if (player.value.length == 0) {
    if (getPlayerName.value.length == 0) {
      debug('player name must set')
      uploadInProgress.value = false
      return
    } else {
      player.value = getPlayerName.value
    }
  }
  document.querySelector('.popover')?.remove()
  const formAction = foundTagRef.value.getAttribute('action')
  const formData = new FormData(foundTagRef.value)
  const foundTag = {
    foundImage: image.value,
    foundPlayer: player.value,
    foundLocation: location.value,
    tagnumber: getCurrentBikeTag.value?.tagnumber ?? 0,
    game: getGameName.value,
    gps: !gpsIsDefault
      ? {
          lat: gps.value.lat,
          long: gps.value.lng,
          alt: gps.value.alt,
        }
      : {},
    inBoundary: isInBoundary.value,
  }
  uploadInProgress.value = false

  emit('submit', {
    formAction,
    formData,
    tag: foundTag,
    storeAction: 'addFoundTag',
  })
}
const changeLocation = (e) => {
  location.value = e.target.value
  if (inputDOM.value == null) {
    inputDOM.value = e.target
  }
}
const setPlace = (e) => {
  gps.value['lat'] = round(e.geometry.location.lat())
  gps.value['lng'] = round(e.geometry.location.lng())
  console.log('setPlace', { gps: gps.value })
  center.value = { ...gps.value }
  location.value = inputDOM.value.value.split(',')[0]
  if (isGpsDefault.value) {
    isGpsDefault.value = false
  }
}
const updateMarker = (e) => {
  gps.value['lat'] = round(e.latLng.lat())
  gps.value['lng'] = round(e.latLng.lng())

  if (isGpsDefault.value) {
    isGpsDefault.value = false
  }
}
const round = (number) => Number(Math.round(number + 'e4') + 'e-4')
const setImage = async (event) => {
  store.fetchCredentials()
  const input = event.target
  if (input.files) {
    locationDisabled.value = false
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

        // Check if the file type is HEIC
        // TODO: this needs resolved: https://github.com/alexcorvi/heic2any/issues/53
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
          const GPSData = await exifr.gps(await input.files[0].arrayBuffer())

          if (GPSData?.latitude && GPSData?.longitude) {
            gps.value = {
              lat: round(GPSData.latitude),
              lng: round(GPSData.longitude),
            }
            isGpsDefault.value = false
            center.value = { ...gps.value }
          } else if (getGame.value?.boundary.lat && getGame.value?.boundary.lng) {
            gps.value = {
              lat: getGame.value?.boundary.lat,
              lng: getGame.value?.boundary.lng,
            }
            isGpsDefault.value = true
            center.value = { ...gps.value }
          } else {
            isGpsDefault.value = false
          }
          location.value = ''
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}
const calculateInBoundary = () => {
  // If the boundary is set
  if (boundary.value.type) {
    isInBoundary.value = isPointInPolygon(boundary.value, gps.value, 100)

    if (!isInBoundary.value) {
      confirmInBoundary.value = true
    }
  } else {
    console.log('boundary not set', boundary.value)
    isInBoundary.value = true
    confirmedBoundary.value = true
    confirmInBoundary.value = false
  }

  return !isInBoundary.value && !confirmedBoundary.value
}

nextTick(() => (showPopover.value = true))

// watch
watch(getPlayerName, (val) => {
  player.value = val
})

// mounted
onMounted(function () {
  nextTick(async () => {
    const regionData = await store.getRegionPolygon(getGame.value.region)
    if (regionData) {
      boundary.value = regionData.geojson
    }

    // setTimeout(() => nextTick(() => (showPopover.value = false)), 100)
    showPopover.value = false
    player.value = getPlayerName.value
    uploadInProgress.value = false
  })
})

// beforeUnmount
onBeforeUnmount(() => {
  document.querySelector('.popover')?.remove()
})
</script>

<style lang="scss">
@import '../assets/styles/style';

input#found {
  margin-left: 3.5rem;
  display: none;
}

.hidden {
  display: none;
}

#found {
  img {
    position: absolute;
    top: 33%;
    left: $default-font-size;
  }

  #google-input {
    left: 2rem;
  }
}

.popover {
  max-width: 320px;
  width: 320px;

  .popover-body {
    padding: 1rem 0.5rem;
  }

  .vue-map {
    height: 400px;
  }

  @media (width >= 600px) {
    max-width: 420px;
    width: 420px;

    iframe {
      width: 400px;
    }
  }

  @media (width >= 800px) {
    width: 620px;
    max-width: 620px;
  }
}
</style>
