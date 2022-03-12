<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <!-- <html-content filename="about-map.html" /> -->
      <bike-tag-button class="m-5" text="Go see all BikeTag Posts" @click="goBikeTagsPage" />
      <bike-tag-map />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
// import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'
import BikeTagMap from '@/components/BikeTagMap.vue'

export default defineComponent({
  name: 'MapView',
  components: {
    // HtmlContent,
    BikeTagButton,
    BikeTagMap,
  },
  data() {
    return {
      styledHr: StyledHr,
      pin: Pin,
    }
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl']),
  },
  methods: {
    goBikeTagsPage() {
      this.$router.push('/biketags')
    },
  },
})
</script>
<style lang="scss" scoped>
.about {
  align-items: center;
  flex-flow: column nowrap;
}
</style>
