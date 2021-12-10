<template>
  <b-container>
    <span>Post Tag</span>
    <div>
      <span>This is what your post look like</span>
      <img class="found-img w-75 p-2" :src="foundImagePreview" />
      <img class="mystery-img w-75 p-2 mb-3" :src="mysteryImagePreview" />
    </div>
    <div>
      <b-button class="w-100 btn-post border-0" @click="submit">
        Post New Tag To Reddit For me &nbsp; <i class="fas fa-check-square" />
      </b-button>
      <b-button class="w-100 btn-reset border-0" @click="reset"> Reset Tag Submission </b-button>
      <span>
        Uploading to BideTag.Org requires that you agree to the terms and conditions set by the
        BikeTag Project
      </span>
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
    ...mapGetters(['getQueuedTag']),
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
