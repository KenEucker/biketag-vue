<template>
  <div class="queue-found-tag">
    <div class="title-cnt">
      <bike-tag-button variant="medium" class="title-q">
        <!-- <h3 class="queue-title">{{ $t('pages.queue.found_title') }}</h3> -->
        <h3 class="queue-title"> Queue your found tag </h3>
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
      <bike-tag-button :class="`click-me ${preview ? 'icn-top' : ''}`" 
        variant="circle" @click="$refs.file.click()">
        <img src="@/assets/images/camera.svg"/>
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
          name="found"
          required
          :placeholder="$t('pages.queue.location_placeholder')"
        />
        <bike-tag-input v-if="!this.$auth.isAuthenticated"
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
        text="Queue Found Tag"
      /> 
    </form>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'

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
      player: this.getName,
      foundImageUrl: null,
      tagNumber: 0,
    }
  },
  computed: {
    ...mapGetters(['getGameName', 'getQueue', 'getQueuedTag', 'getPlayerId', 'getCurrentBikeTag', 'getUser']),
    getName(){
      if (this.$auth.isAuthenticated) return this.getUser.name ?? this.tag?.foundPlayer ?? ''
      else this.tag?.foundPlayer ?? ''
    }
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
