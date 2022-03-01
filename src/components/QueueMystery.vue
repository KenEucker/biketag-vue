<template>
  <div class="queue-mystery-tag">
    <b-modal v-model="modalShow" title="BootstrapVue" hide-footer hide-header>
      <img class="close-btn" src="@/assets/images/close.svg" @click="hideModal" />
      <bike-tag-button class="modal-header" variant="medium">
        <p>You are {{ stringifyNumber(numberInQueue) }} in the Queue!</p>
      </bike-tag-button>
      <p style="text-align: center" class="go-queue" @click="goViewQueue">View Queue</p>
    </b-modal>
    <!-- <h3 class="queue-title">{{ $t('pages.queue.mystery_title') }}</h3> -->
    <div class="title-cnt">
      <bike-tag-button variant="medium" class="title-q">
        <h3 class="queue-title">Add your new mystery Location</h3>
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
        <input
          id="file-upload"
          ref="file"
          type="file"
          class="d-none"
          accept="image/*"
          required
          @change="setImage"
        />
        <p class="queue-text">{{ $t('pages.queue.mystery_text') }}</p>
        <div class="input-cnt mt-3 mb-3">
          <bike-tag-input
            v-if="!$auth.isAuthenticated"
            id="player"
            v-model="player"
            name="player"
            readonly
            :placeholder="$t('pages.queue.name_placeholder')"
          />
          <bike-tag-input
            id="hint"
            v-model="hint"
            name="hint"
            :placeholder="$t('pages.queue.hint_placeholder')"
          />
        </div>
        <!-- <div class="mt-3">
          <bike-tag-button
            variant="medium"
            :text="`${$t('pages.queue.submit_new_tag')} ${$t('pages.queue.queue_postfix')}`"
            @click="onSubmit"
          />
        </div> -->
        <bike-tag-button
          variant="medium"
          type="submit"
          :text="`${$t('pages.queue.submit_new_tag')} ${$t('pages.queue.queue_postfix')}`"
        />
      </form>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'
import { stringifyNumber } from '@/common/utils'

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
      player: '',
      hint: this.tag?.hint ?? '',
      image: this.tag?.mysteryImage,
      modalShow: true,
      numberInQueue: 1,
    }
  },
  computed: {
    ...mapGetters([
      'getGameName',
      'getQueue',
      'getQueuedTag',
      'getPlayerId',
      'getCurrentBikeTag',
      'getUser',
    ]),
    getName() {
      if (this.$auth.isAuthenticated)
        return (
          this.getUser.name ??
          (this.tag?.mysteryPlayer?.length ? this.tag.mysteryPlayer : this.tag?.foundPlayer ?? '')
        )
      else
        return this.tag?.mysteryPlayer?.length
          ? this.tag.mysteryPlayer
          : this.tag?.foundPlayer ?? ''
    },
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
    goViewQueue() {
      this.hideModal()
      this.$nextTick(() => this.$store.dispatch('resetFormStep'))
    },
    hideModal() {
      this.modalShow = false
    },
    stringifyNumber,
  },
})
</script>
<style lang="scss" scoped>
.modal-header {
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  font-size: 2rem;
  @media (min-width: 470px) {
    font-size: 3rem;
  }
}
.go-queue {
  // font-family: markernotes;
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
