<template>
  <div class="queue-found-tag">
    <div class="title-cnt">
      <bike-tag-button variant="medium" class="title-q">
        <h3 class="queue-title">{{ $t('pages.queue.found_title') }}</h3>
      </bike-tag-button>
    </div>
    <div class="preview-cnt">
      <template v-if="preview">
        <img :src="preview" class="prev-img img-fluid" />
        <img class="img-bck" src="@/assets/images/transparent_img.svg" />
      </template>
      <img
        v-else
        class="img-bck click-me"
        src="@/assets/images/blank_img.svg"
        @click="$refs.file.click()"
      />
      <bike-tag-button
        :class="`click-me ${preview ? 'icn-top' : ''}`"
        variant="circle"
        @click="$refs.file.click()"
      >
        <img src="@/assets/images/camera.svg" />
      </bike-tag-button>
    </div>
    <form
      ref="foundTag"
      name="queue-found-tag"
      action="queue-found-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="queue-found-tag" />
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
      <div class="input-cnt mt-3 mb-3">
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
          v-if="!$auth.isAuthenticated"
          id="player"
          v-model="player"
          name="player"
          required
          :placeholder="$t('pages.queue.name_placeholder')"
        />
      </div>
      <!-- <bike-tag-button
        variant="medium"
        type="submit"
        :text="`${$t('pages.queue.queue_found_tag')} ${$t('pages.queue.queue_postfix')}`"
      /> -->
      <bike-tag-button
        variant="medium"
        type="submit"
        :text="$t('pages.queue.queue_found_tag')"
        @click="onSubmit"
      />
    </form>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'
import ExifParser from 'exif-parser'
import Pin from '@/assets/images/pin.svg'

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
      imageGps: null,
      pinIcon: Pin,
      showPopover: false,
      inputDOM: null,
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
  },
  created() {
    this.$nextTick(() => (this.showPopover = true))
  },
  mounted() {
    setTimeout(() => this.$nextTick(() => (this.showPopover = false)), 100)
    this.player = this.getName
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      if (this.location.length == 0) {
        if (this.gps.lat == null) {
          return
        }
        this.location = this.getLocation
      }
      if (this.player.length == 0) {
        if (this.getName.length == 0) {
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
      /// TODO: fetch upload credentials

      var input = event.target
      if (input.files) {
        this.image = input.files[0]
        const previewReader = new FileReader()
        previewReader.onload = (e) => {
          this.preview = e.target.result
        }
        previewReader.readAsDataURL(this.image)
        this.image.arrayBuffer().then((value) => {
          const results = ExifParser.create(value).parse()
          if (results.tags.GPSLatitude != null && results.tags.GPSLongitude != null) {
            this.gps = {
              lat: this.round(results.tags.GPSLatitude),
              lng: this.round(results.tags.GPSLongitude),
            }
            this.imageGps = { ...this.gps }
            this.center = { ...this.gps }
            this.location = this.getLocation
          }
          this.locationDisabled = false
        })
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
