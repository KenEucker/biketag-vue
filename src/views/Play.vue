<template>
  <div class="container rel">
    <div>
      <b-button
        v-if="tagnumber === 0"
        v-b-popover.click="
          getCurrentBikeTag && getCurrentBikeTag.hint && getCurrentBikeTag.hint.length
            ? getCurrentBikeTag.hint
            : 'no hint provided, sorry'
        "
        class="btn-hint"
        title="NEED A HINT?"
        variant="primary"
      >
        ?
      </b-button>
      <bike-tag
        v-if="tagnumber === 0"
        :tagnumber="getCurrentBikeTag.tagnumber"
        :mystery-image-url="getCurrentBikeTag.mysteryImageUrl"
        :player="getCurrentBikeTag.mysteryPlayer"
        mystery-description="CURRENT MYSTERY LOCATION TO FIND"
        @load="tagLoaded"
      />
      <bike-tag v-if="tagnumber !== 0" :tag="tag" @load="tagLoaded" />
    </div>
  </div>
  <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="fullPage">
    <img class="spinner" src="images/SpinningBikeV1.svg" />
  </loading>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'PlayView',
  components: {
    BikeTag,
    Loading,
  },
  data() {
    console.log(this.$route.params)
    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
      tagIsLoading: false,
    }
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag', 'getTags']),
    tag() {
      if (this.tagnumber !== 0) {
        const tag = this.getTags?.filter((t) => t.tagnumber === this.tagnumber)
        return tag && tag.length ? tag[0] : {}
      }
      return undefined
    },
  },
  created() {
    this.tagIsLoading = true
  },
  updated() {
    // this.tagIsLoading = true
    this.$store.dispatch('setTags')
  },
  methods: {
    hint() {
      alert(this.getCurrentBikeTag.hint)
    },
    tagLoaded() {
      this.tagIsLoading = false
    },
  },
})
</script>
<style scoped lang="scss">
.rel {
  position: relative;
}
.btn-hint {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 99;
  font-size: 1.25em;
}
.spinner {
  animation-name: spin;
  animation-duration: 1000ms;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
