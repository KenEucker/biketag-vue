<template>
  <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container rel">
    <div>
      <b-button
        v-if="tagnumber === 0"
        v-b-popover.click="getHint"
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
        size="l"
        mystery-description="CURRENT MYSTERY LOCATION TO FIND"
      />
      <bike-tag v-else :tag="tag" size="l" @load="tagLoaded" />
    </div>
  </div>
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
      tagIsLoading: true,
    }
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag', 'getCurrentHint', 'getTags']),
    tag() {
      if (this.tagnumber !== 0) {
        const tag = this.getTags?.filter((t) => t.tagnumber === this.tagnumber)
        return tag && tag.length ? tag[0] : {}
      }
      return undefined
    },
    getHint() {
      return this.getCurrentBikeTag.hint ?? 'no hint provided, sorry'
    },
  },
  created() {
    this.tagIsLoading = true
  },
  async mounted() {
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    this.tagIsLoading = false
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
</style>
