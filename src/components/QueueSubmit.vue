<template>
  <b-container>
    <span>{{ $t('pages.queue.submit_title') }}</span>
    <div>
      <span>{{ $t('pages.queue.image_label') }}</span>
      <img class="found-img w-75 p-2" :src="foundImagePreview" />
      <img class="mystery-img w-75 p-2 mb-3" :src="mysteryImagePreview" />
    </div>
    <div>
      <form
        ref="submitTag"
        name="submit-queued-tag"
        action="submit-queued-tag"
        method="POST"
        netlify
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
      >
        <b-button class="w-100 btn-post border-0" @click="submit">
          {{ $t('pages.queue.post_new_tag') }} &nbsp; <i class="fas fa-check-square" />
        </b-button>
        <b-button class="w-100 btn-reset border-0" @click="reset">
          {{ $t('pages.queue.reset_tag') }}
        </b-button>
      </form>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'SubmitQueued',
  emits: ['submit'],
  data() {
    return {
      foundImagePreview: '',
      mysteryImagePreview: '',
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getQueuedTag']),
  },
  mounted() {
    this.setFoundImagePreview(this.getQueuedTag)
    this.setMysteryImagePreview(this.getQueuedTag)
  },
  methods: {
    onSubmit() {
      const formAction = this.$refs.mysteryTag.getAttribute('action')
      const formData = new FormData(this.$refs.mysteryTag)
      const formBody = new URLSearchParams(formData).toString()
      const submittedTag = {
        discussionUrl: JSON.stringify({
          postToReddit: true,
        }),
        mentionUrl: JSON.stringify({
          postToTwitter: false,
        }),
      }

      this.$emit('submit', {
        formAction,
        formData,
        formBody,
        tag: submittedTag,
        storeAction: 'submitQueuedTag',
      })
    },
    reset() {
      this.$store.dispatch('resetFormStepToFound')
    },
    setMysteryImagePreview(tag) {
      if (tag.mysteryImageUrl?.length) {
        this.mysteryImagePreview = tag.mysteryImageUrl
      } else if (tag.mysteryImage) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.mysteryImagePreview = e.target.result
        }
        reader.readAsDataURL(tag.mysteryImage)
      }
    },
    setFoundImagePreview(tag) {
      if (tag.foundImageUrl?.length) {
        this.foundImagePreview = tag.foundImageUrl
      } else if (tag.foundImage) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.foundImagePreview = e.target.result
        }
        reader.readAsDataURL(tag.foundImage)
      }
    },
  },
})
</script>
<style scoped lang="scss">
.found-img {
  float: left;
}

.mystery-img {
  float: right;
}
</style>
