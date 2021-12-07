<template>
  <div class="container">
    <div>
      <bike-tag
        hint-btn="true"
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
<style scoped></style>
