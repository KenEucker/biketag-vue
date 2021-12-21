<template>
  <b-container>
    <span>{{ $t('pages.queue.submit_title') }}</span>
    <div>
      <span>{{ $t('pages.queue.image_label') }}</span>
      <img class="found-img w-75 p-2" :src="foundImagePreview" />
      <img class="mystery-img w-75 p-2 mb-3" :src="mysteryImagePreview" />
    </div>
    <div>
      <form ref="tagForm" name="queueFoundTag" method="POST" data-netlify="true">
        <b-button class="w-100 btn-post border-0" @click="submit">
          {{ $t('pages.queue.post_new_tag') }} &nbsp; <i class="fas fa-check-square" />
        </b-button>
        <b-button class="w-100 btn-reset border-0" @click="reset">
          {{ $t('pages.queue.reset_tag') }}
        </b-button>
        <span>
          {{ $t('pages.queue.user_agree') }}
        </span>
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
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
    submit() {
      this.$refs.tagForm.submit()
      this.$emit('submit')
    },
    reset() {
      this.$store.dispatch('setQueuedTag', {})
      this.$store.dispatch('resetFormStep')
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
