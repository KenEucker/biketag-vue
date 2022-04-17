<template>
  <loading v-show="uploadInProgress" v-model:active="uploadInProgress" class="realign-spinner">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
  </loading>
  <b-modal v-model="showModal" title="Authenticate" hide-footer hide-header>
    <img class="close-btn" src="@/assets/images/close.svg" @click="hideModal" />
    <form @submit.prevent="onSubmit">
      <div style="margin-top: 2rem">
        <p>{{ $t('pages.round.player_name_reserved') }}</p>
        <bike-tag-input id="passcode" v-model="passcode" name="passcode" placeholder="passcode" />
        <bike-tag-button class="modal-sub-btn" variant="medium" text="Submit" />
      </div>
    </form>
  </b-modal>
  <div :class="`add-found-tag ${uploadInProgress ? 'hidden' : ''}`">
    <div class="title-container">
      <bike-tag-button variant="medium" @click="$refs.file.click()">
        <h3 class="queue-title">{{ $t('pages.round.found_title') }}</h3>
      </bike-tag-button>
    </div>
    <div class="preview-container">
      <template v-if="preview">
        <img :src="preview" class="prev-img" />
        <img class="img-bck" src="@/assets/images/transparent_img.svg" />
      </template>
      <img
        v-else
        class="img-bck click-me"
        src="@/assets/images/blank_img.svg"
        @click="$refs.file.click()"
      />
      <bike-tag-button
        :class="`click-me icn ${preview ? 'icn--top' : ''}`"
        variant="circle"
        @click="$refs.file.click()"
      >
        <img src="@/assets/images/camera.svg" />
      </bike-tag-button>
    </div>
    <form
      ref="foundTag"
      name="add-found-tag"
      action="add-found-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
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
      <p class="queue-text">{{ $t('pages.round.found_text') }}</p>
      <div class="mt-3 mb-3 input-container">
        <bike-tag-input
          id="found"
          :disabled="locationDisabled"
          name="found"
          required
          :placeholder="$t('pages.round.location_placeholder')"
        >
          <img :src="pinIcon" />
          <GMapAutocomplete
            v-if="isGpsDefault"
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
          <p v-if="locationDisabled">{{ $t('pages.round.image_first') }}</p>
          <bike-tag-map
            v-if="isGps"
            variant="play/input"
            :gps="gps"
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
          :placeholder="$t('pages.round.name_placeholder')"
        />
      </div>
      <div class="sub-container">
        <bike-tag-button
          variant="medium"
          type="submit"
          :text="$t('pages.round.queue_found_tag')"
          @click="onSubmit"
        />
      </div>
    </form>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'
import exifr from 'exifr'
// import { Notifications } from '@/common/types'
import { debug } from '@/common/utils'

export default defineComponent({
  name: 'QueueFoundTag',
  components: {
    BikeTagButton,
    BikeTagInput,
    BikeTagMap,
  },
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  emits: ['submit'],
  data: function () {
    return {
      preview: null,
      image: this.tag?.foundImage ?? '',
      location: '',
      player: '',
      foundImageUrl: null,
      tagNumber: 0,
      locationDisabled: true,
      center: { lat: 0, lng: 0 },
      gps: { lat: null, lng: null },
      isGpsDefault: true,
      showPopover: false,
      inputDOM: null,
      passcode: Date.now().toString(), // don't let them just get away with it
      showModal: false,
      uploadInProgress: false,
    }
  },
  computed: {
    ...mapGetters([
      'getGameName',
      'getQueue',
      'getPlayerTag',
      'getPlayerId',
      'getCurrentBikeTag',
      'getProfile',
      'getGame',
    ]),
    getName() {
      return this.getProfile?.user_metadata?.name ?? this.tag?.foundPlayer ?? ''
    },
    isGps() {
      return this.gps.lat && this.gps.lng
    },
    getLocation() {
      if (this.location.length > 0) {
        return this.location
      } else if (this.isGps) {
        return `${this.gps.lat}, ${this.gps.lng}`
      }

      return this.location
    },
    isAuthenticated() {
      return this.$auth.isAuthenticated
    },
  },
  created() {
    this.$nextTick(() => (this.showPopover = true))
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => this.$nextTick(() => (this.showPopover = false)), 100)
      // this.showPopover = false
      this.player = this.getName
      this.uploadInProgress = false
    })
  },
  beforeUnmount() {
    document.querySelector('.popover')?.remove()
  },
  methods: {
    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    },
    hideModal() {
      this.showModal = false
    },
    async onSubmit(e) {
      e.preventDefault()
      this.uploadInProgress = true
      if (!this.location?.length) {
        this.$toast.open({
          message: 'Please add your Found Location',
          type: 'error',
          position: 'top',
        })
        this.uploadInProgress = false
        return
      }
      if (!this.player) {
        this.$toast.open({
          message: 'Please enter a name',
          type: 'error',
          position: 'top',
        })
        this.uploadInProgress = false
        return
      }
      if (!this.$auth.isAuthenticated) {
        try {
          await this.$store.dispatch('checkPasscode', {
            name: this.player,
            passcode: this.passcode,
          })
          this.showModal = false
          await this.sleep(100)
        } catch {
          if (this.showModal) {
            this.$toast.open({
              message: 'Incorrect passcode',
              type: 'error',
              position: 'top',
            })
          }
          this.$nextTick(() => (this.showModal = !this.showModal))
          this.passcode = ''
          this.uploadInProgress = false
          return
        }
      }
      if (!this.image) {
        this.$toast.open({
          message: 'Invalid image, add a new one.',
          type: 'error',
          position: 'top',
        })
        this.uploadInProgress = false
        return
      }
      if (this.location?.length == 0) {
        if (this.gps.lat == null) {
          debug('location must be set')
          this.uploadInProgress = false
          return
        }
      }
      if (this.player.length == 0) {
        if (this.getName.length == 0) {
          debug('player name must set')
          this.uploadInProgress = false
          return
        } else {
          this.player = this.getName
        }
      }
      document.querySelector('.popover')?.remove()
      console.log(this.$refs)
      console.log(this.$refs.foundTag)
      const formAction = this.$refs.foundTag.getAttribute('action')
      const formData = new FormData(this.$refs.foundTag)
      const foundTag = {
        foundImage: this.image,
        foundPlayer: this.player,
        foundLocation: this.location,
        tagnumber: this.getCurrentBikeTag?.tagnumber ?? 0,
        game: this.getGameName,
        gps: {
          lat: this.gps.lat,
          long: this.gps.lng,
          alt: this.gps.alt,
        },
      }
      this.uploadInProgress = false

      this.$emit('submit', {
        formAction,
        formData,
        tag: foundTag,
        storeAction: 'addFoundTag',
      })
    },
    changeLocation(e) {
      this.location = e.target.value
      if (this.inputDOM == null) {
        this.inputDOM = e.target
      }
    },
    setPlace(e) {
      this.gps['lat'] = this.round(e.geometry.location.lat())
      this.gps['lng'] = this.round(e.geometry.location.lng())
      this.center = { ...this.gps }
      this.location = this.inputDOM.value.split(',')[0]
      if (this.isGpsDefault) {
        this.isGpsDefault = false
      }
    },
    updateMarker(e) {
      this.gps['lat'] = this.round(e.latLng.lat())
      this.gps['lng'] = this.round(e.latLng.lng())
      if (this.isGpsDefault) {
        this.isGpsDefault = false
      }
    },
    round(number) {
      return Number(Math.round(number + 'e4') + 'e-4')
    },
    setImage(event) {
      this.$store.dispatch('fetchCredentials')
      const input = event.target
      if (input.files) {
        this.locationDisabled = false
        try {
          const previewReader = new FileReader()
          previewReader.onload = (e) => {
            this.preview = e.target.result
          }
          previewReader.readAsDataURL(input.files[0])
          if (input.files[0].size / Math.pow(1024, 2) > 15) {
            this.$toast.open({
              message: 'Image exceds 15mb',
              type: 'error',
              position: 'top',
            })
          } else {
            input.files[0].arrayBuffer().then(async (value) => {
              const results = await exifr.parse(value)
              const createDate = results?.CreateDate ?? results?.DateTimeOriginal ?? Date.now()

              if (createDate < this.getCurrentBikeTag.mysteryTime) {
                this.$toast.open({
                  message: 'Timestamp Error',
                  type: 'error',
                  position: 'top',
                })
              } else {
                this.image = input.files[0]
              }

              const GPSData = await exifr.gps(value)

              if (GPSData) {
                if (GPSData.latitude != null && GPSData.longitude != null) {
                  this.gps = {
                    lat: this.round(GPSData.latitude),
                    lng: this.round(GPSData.longitude),
                  }
                  this.isGpsDefault = false
                }
              } else {
                this.gps = this.getGame?.boundary
                this.isGpsDefault = true
              }
              this.center = { ...this.gps }
              this.location = ''
            })
          }
        } catch (e) {
          console.error(e)
        }
      }
    },
  },
})
</script>
<style lang="scss">
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
    left: 1.5rem;
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
  @media (min-width: 600px) {
    max-width: 420px;
    width: 420px;

    iframe {
      width: 400px;
    }
  }
  @media (min-width: 800px) {
    width: 620px;
    max-width: 620px;
  }
}
</style>
