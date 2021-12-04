<template>
  <b-spinner v-show="loading" />
  <div v-show="!loading" class="container">
    <div>
      <bike-tag
        :tagnumber="getLastTag.tagnumber"
        :mystery-image-url="getLastTag.mysteryImageUrl"
        :player="getLastTag.player"
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
  data() {
    return {
      loading: true,
    }
  },
  computed: {
    ...mapGetters(['getLastTag']),
  },
  mounted() {
    this.loading = false
  },
})
</script>
<style scoped></style>
