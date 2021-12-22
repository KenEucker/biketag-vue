<template>
  <b-container class="col-8 col-lg-6">
    <span>{{ $t('pages.queue.mystery_title') }}</span>
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
      ref="mysteryTag"
      name="queue-mystery-tag"
      action="queue-mystery-tag"
      method="POST"
      netlify
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
          @change="setImage"
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
      <div>
        <b-form-input
          id="hint"
          v-model="hint"
          name="hint"
          :placeholder="$t('pages.queue.hint_placeholder')"
        />
      </div>
      <div class="mt-3">
        <b-button class="w-100 btn-mystery border-0" @click="onSubmit">
          {{ $t('pages.queue.submit_new_tag') }} &nbsp; <i class="fas fa-check-square" />
        </b-button>
        <span>
          {{ $t('pages.queue.user_agree') }}
        </span>
      </div>
    </form>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueueMysteryTag',
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
      image: this.tag?.mysteryImage,
      hint: this.tag?.hint ?? '',
      player: this.tag?.mysteryPlayer ?? this.tag?.foundPlayer ?? '',
      mysteryImageUrl: null,
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getQueuedTag', 'getPlayerId']),
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      const formAction = this.$refs.mysteryTag.getAttribute('action')
      const formData = new FormData(this.$refs.mysteryTag)
      const body = new URLSearchParams(formData).toString()

      fetch(formAction, {
        method: 'POST',
        headers: {
          Accept: 'application/x-www-form-urlencoded;charset=UTF-8',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body,
      }).then((res) => {
        console.log({ formSubmitted: res })

        this.$store.dispatch('setQueueMystery', {
          mysteryImage: this.image,
          mysteryPlayer: this.player,
          hint: this.hint,
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
        var reader = new FileReader()
        reader.onload = (e) => {
          this.preview = e.target.result
        }
        this.image = input.files[0]
        reader.readAsDataURL(input.files[0])
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
