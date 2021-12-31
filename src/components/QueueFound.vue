<template>
  <b-container class="col-8 col-lg-6">
    <span>{{ $t('pages.queue.found_title') }}</span>
    <div>
      <img v-if="preview" :src="preview" class="img-fluid" />
      <img
        v-else
        class="img-fluid click-me"
        src="@/assets/images/blank.png"
        @click="$refs.file.click()"
      />
    </div>
    <form
      ref="foundTag"
      name="queue-found-tag"
      action="/queue-found-tag"
      method="POST"
      netlify
      data-netlify-honeypot="bot-field"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="queue-found-tag" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <input v-model="foundImageUrl" type="hidden" name="foundImageUrl" />
      <div class="p-3">
        <label for="file-upload" class="btn-upload custom-file-upload">
          <i class="fa fa-camera" />
        </label>
        <input
          id="file-upload"
          ref="file"
          type="file"
          class="d-none"
          accept="image/*"
          @change="setImage"
        />
      </div>
      <div>
        <b-form-input
          id="found"
          v-model="location"
          name="found"
          :placeholder="$t('pages.queue.location_placeholder')"
        />
      </div>
      <div class="mt-3">
        <b-form-input
          id="name"
          v-model="player"
          name="player"
          :placeholder="$t('pages.queue.name_placeholder')"
        />
      </div>
      <div class="mt-3">
        <b-button class="w-100 btn-found border-0" type="submit">
          {{ $t('pages.queue.queue_found_tag') }} &nbsp; <i class="fas fa-check-square" />
        </b-button>
      </div>
    </form>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import axios from 'axios'

export default defineComponent({
  name: 'QueueFoundTag',
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data: function () {
    return {
      preview: null,
      image: this.tag?.foundImage ?? '',
      location: this.tag?.foundLocation ?? '',
      player: this.tag?.foundPlayer ?? '',
      foundImageUrl: null,
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getQueuedTag', 'getPlayerId']),
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      const formData = new FormData(this.$refs.foundTag)
      const body = new URLSearchParams(formData).toString()

      const axiosConfig = {
        header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
      axios
        .post('/', body, axiosConfig)
        .then((res) => {
          console.log({ formSubmitted: res })

          this.$store.dispatch('setQueueFound', {
            foundImage: this.image,
            foundLocation: this.location,
            foundPlayer: this.player,
          })
          this.goNextStep()
        })
        .catch((err) => {
          console.log(err)

          this.$store.dispatch('setQueueFound', {
            foundImage: this.image,
            foundLocation: this.location,
            foundPlayer: this.player,
          })
          this.goNextStep()
        })
    },
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
    setImage(event) {
      var input = event.target
      if (input.files) {
        const previewReader = new FileReader()
        previewReader.onload = (e) => {
          this.preview = e.target.result
        }
        previewReader.readAsDataURL(input.files[0])

        const imageReader = new FileReader()
        imageReader.readAsDataURL(input.files[0])
        imageReader.onload = (e) => {
          this.image = e.target.result
        }
      }
    },
  },
})
</script>
<style scoped lang="scss">
.custom-file-upload {
  border-radius: 2rem;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
.click-me {
  cursor: pointer;
}
</style>
