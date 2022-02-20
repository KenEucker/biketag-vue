<template>
  <b-container class="queue-mystery-tag col-md-8 col-lg-8">
    <h3 class="queue-title">{{ $t('pages.queue.mystery_title') }}</h3>
    <div>
      <img v-if="preview" :src="preview" class="img-fluid" />
      <img
        v-else
        class="img-fluid click-me"
        src="@/assets/images/blank.png"
        @click="$refs.file.click()"
      />
    </div>
    <div class="container biketag-tagit-form">
      <form
        ref="mysteryTag"
        name="queue-mystery-tag"
        action="queue-mystery-tag"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
      >
        <input type="hidden" name="form-name" value="queue-mystery-tag" />
        <input type="hidden" name="playerId" :value="getPlayerId" />
        <input v-model="mysteryImageUrl" type="hidden" name="mysteryImageUrl" />
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
        <p class="queue-text">{{ $t('pages.queue.mystery_text') }}</p>
        <div class="mt-3">
          <bike-tag-input
            id="player"
            v-model="player"
            name="player"
            readonly
            :placeholder="$t('pages.queue.name_placeholder')"
          />
        </div>
        <div>
          <bike-tag-input
            id="hint"
            v-model="hint"
            name="hint"
            :placeholder="$t('pages.queue.hint_placeholder')"
          />
        </div>
        <div class="mt-3">
          <bike-tag-button
            variant="medium"
            :text="`${$t('pages.queue.submit_new_tag')} ${$t('pages.queue.queue_postfix')}`"
            @click="onSubmit"
          />
        </div>
      </form>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'

export default defineComponent({
  name: 'QueueMysteryTag',
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
      mysteryImageUrl: null,
      player: this.tag?.mysteryPlayer?.length
        ? this.tag.mysteryPlayer
        : this.tag?.foundPlayer ?? '',
      hint: this.tag?.hint ?? '',
      image: this.tag?.mysteryImage,
    }
  },
  computed: {
    ...mapGetters(['getGameName', 'getQueue', 'getQueuedTag', 'getPlayerId', 'getCurrentBikeTag']),
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      const formAction = this.$refs.mysteryTag.getAttribute('action')
      const formData = new FormData(this.$refs.mysteryTag)
      const mysteryTag = {
        mysteryImage: this.image,
        mysteryPlayer: this.player,
        hint: this.hint ?? '',
        tagnumber: this.getCurrentBikeTag?.tagnumber + 1 ?? 1,
        game: this.getGameName,
      }

      this.$emit('submit', {
        formAction,
        formData,
        tag: mysteryTag,
        storeAction: 'queueMysteryTag',
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
<style lang="scss">
.queue-mystery-tag {
  .biketag-button {
    width: 100%;
  }
}
</style>
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
