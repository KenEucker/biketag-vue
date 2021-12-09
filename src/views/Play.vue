<template>
  <div class="container">
    <div>
      <bike-tag
        class="biketag"
        :hint-btn="true"
        :tagnumber="getCurrentBikeTag.tagnumber"
        :mystery-image-url="getCurrentBikeTag.mysteryImageUrl"
        :player="getCurrentBikeTag.player"
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
  name: 'PlayPage',
  components: {
    BikeTag,
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag']),
  },
})
</script>
<style scoped lang="scss">
.biketag {
  // width: auto;
  // max-width: 90vw;
  // height: auto;
  // max-height: 100vh;
}
</style>
