<template>
  <b-modal v-model="showModal" title="Authenticate" hide-footer hide-header>
    <img class="close-btn" src="@/assets/images/close.svg" @click="hideModal" />
    <form @submit.prevent="onSubmit">
      <div style="margin-top: 2rem">
        <bike-tag-input id="passcode" v-model="passcode" name="passcode" placeholder="passcode" />
        <bike-tag-button class="modal-sub-btn" variant="medium" text="Submit" />
      </div>
    </form>
  </b-modal>
  <div class="add-found-tag">
    <div class="title-cnt">
      <bike-tag-button variant="medium" @click="$refs.file.click()">
        <h3 class="queue-title">{{ $t('pages.queue.found_title') }}</h3>
      </bike-tag-button>
    </div>
    <div class="preview-cnt">
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
      <p class="queue-text">{{ $t('pages.queue.found_text') }}</p>
      <div class="mt-3 mb-3 input-cnt">
        <bike-tag-input
          id="found"
          v-model="location"
          :disabled="locationDisabled"
          name="found"
          required
          :placeholder="$t('pages.queue.location_placeholder')"
        >
          <img :src="pinIcon" />
          <GMapAutocomplete
            id="google-input"
            :disabled="locationDisabled"
            @input="changeLocation"
            @blur="changeLocation"
            @click="changeLocation"
            @place_changed="setPlace"
          />
        </bike-tag-input>
        <b-popover target="found" :show="showPopover" triggers="click" placement="top">
          <template #title> Location: {{ getLocation }} </template>
          <p v-if="locationDisabled">{{ $t('pages.queue.image_first') }}</p>
          <GMapMap
            v-if="isGps"
            :center="center"
            :zoom="18"
            map-type-id="roadmap"
            style="width: 300px; height: 400px"
            :region="getGameBoundary"
          >
            <GMapMarker
              :icon="pinIcon"
              :position="gps"
              :draggable="true"
              :clickeable="true"
              @dragend="updateMarker"
            />
          </GMapMap>
        </b-popover>
        <bike-tag-input
          id="player"
          v-model="player"
          name="player"
          required
          :readonly="isAuthenticated"
          :placeholder="$t('pages.queue.name_placeholder')"
        />
      </div>
      <div class="sub-cnt">
        <bike-tag-button
          variant="medium"
          type="submit"
          :text="$t('pages.queue.queue_found_tag')"
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
import exifr from 'exifr'
import Pin from '@/assets/images/pin.svg'
// import { Notifications } from '@/common/types'

export default defineComponent({
  name: 'QueueFoundTag',
  components: {
    BikeTagButton,
    BikeTagInput,
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
      location: this.tag?.foundLocation ?? '',
      player: '',
      foundImageUrl: null,
      tagNumber: 0,
      locationDisabled: true,
      center: { lat: 0, lng: 0 },
      gps: { lat: null, lng: null },
      pinIcon: Pin,
      showPopover: false,
      inputDOM: null,
      passcode: Date.now().toString(), // don't let them just get away with it
      showModal: false,
    }
  },
  computed: {
    ...mapGetters([
      'getGameName',
      'getQueue',
      'getQueuedTag',
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
    })
    window.onpopstate = () => {
      window.onpopstate = null
      document.querySelector('.popover')?.remove() ///
    }
    // this.$croquet.sendNotification({
    //   name: this.getProfile?.user_metadata?.name,
    //   msg: "HELLO",
    //   type: Notifications.foundTag
    // })
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
      if (!this.image) {
        this.$toast.open({
          message: 'Please add your Found Location image',
          type: 'error',
          position: 'top',
        })
        return
      }
      if (!this.player) {
        this.$toast.open({
          message: 'Please enter a name',
          type: 'error',
          position: 'top',
        })
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
          return
        }
      }
      if (!this.image) {
        this.$toast.open({
          message: 'Invalid image, add a new one.',
          type: 'error',
          position: 'top',
        })
        return
      }
      if (this.location.length == 0) {
        if (this.gps.lat == null) {
          console.log('location must be set')
          return
        }
        this.location = this.getLocation
      }
      if (this.player.length == 0) {
        if (this.getName.length == 0) {
          console.log('player name must set')
          return
        } else {
          this.player = this.getName
        }
      }
      document.querySelector('.popover')?.remove()
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

      this.$emit('submit', {
        formAction,
        formData,
        tag: foundTag,
        storeAction: 'queueFoundTag',
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
      this.location = this.inputDOM.value
    },
    updateMarker(e) {
      this.gps['lat'] = this.round(e.latLng.lat())
      this.gps['lng'] = this.round(e.latLng.lng())
      if (this.location.length == 0) {
        this.location = this.getLocation
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
                }
              } else {
                this.gps = this.getGame.boundary
              }
              this.center = { ...this.gps }
              this.location = this.getLocation
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
