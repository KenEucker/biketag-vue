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
      />
      <bike-tag v-if="tagnumber !== 0" :tag="tag" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'

export default defineComponent({
  name: 'PlayView',
  components: {
    BikeTag,
  },
  data() {
    console.log(this.$route.params)
    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
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
  updated() {
    this.$store.dispatch('setTags')
  },
  methods: {
    hint() {
      alert(this.getCurrentBikeTag.hint)
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
