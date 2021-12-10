<template>
  <div class="container">
    <div>
      <bike-tag
        :hint-btn="true"
        :tagnumber="getCurrentBikeTag.tagnumber"
        :mystery-image-url="getCurrentBikeTag.mysteryImageUrl"
        :player="getCurrentBikeTag.mysteryPlayer"
        mystery-description="CURRENT MYSTERY LOCATION TO FIND"
      />
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
})
</script>
