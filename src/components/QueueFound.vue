<template>
  <b-container class="col-md-8 col-lg-8">
    <h3 class="queue-title">{{ $t('pages.queue.found_title') }}</h3>
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
      action="queue-found-tag"
      method="POST"
      data-netlify="true"
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
          required
          @change="setImage"
        />
      </div>
      <p class="queue-text">{{ $t('pages.queue.found_text') }}</p>
      <div>
        <b-form-input
          id="found"
          v-model="location"
          name="found"
          required
          :placeholder="$t('pages.queue.location_placeholder')"
        />
      </div>
      <div class="mt-3">
        <b-form-input
          id="player"
          v-model="player"
          name="player"
          required
          :placeholder="$t('pages.queue.name_placeholder')"
        />
      </div>
      <div class="mt-3">
        <b-button class="w-75 btn-found border-0" type="submit">
          {{ `${$t('pages.queue.queue_found_tag')} ${$t('pages.queue.queue_postfix')}` }} &nbsp;
          <i class="fas fa-check-square" /> *
        </b-button>
      </div>
    </form>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

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
  emits: ['submit'],
  data: function () {
    return {
      preview: null,
      image: this.tag?.foundImage ?? '',
      location: this.tag?.foundLocation ?? '',
      player: this.tag?.foundPlayer ?? '',
      foundImageUrl: null,
      tagNumber: 0,
    }
  },
  computed: {
    ...mapGetters(['getGameName', 'getQueue', 'getQueuedTag', 'getPlayerId', 'getCurrentBikeTag']),
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      const formAction = this.$refs.foundTag.getAttribute('action')
      const formData = new FormData(this.$refs.foundTag)
      const foundTag = {
        foundImage: this.image,
        foundPlayer: this.player,
        foundLocation: this.location,
        tagnumber: this.getCurrentBikeTag?.tagnumber ?? 0,
        game: this.getGameName,
      }

      this.$emit('submit', {
        formAction,
        formData,
        tag: foundTag,
        storeAction: 'queueFoundTag',
      })
    },
    setImage(event) {
      var input = event.target
      if (input.files) {
        this.image = input.files[0]
        const previewReader = new FileReader()
        previewReader.onload = (e) => {
          this.preview = e.target.result
        }
        previewReader.readAsDataURL(this.image)
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
