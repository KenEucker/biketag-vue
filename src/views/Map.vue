<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <h2>This is the boundary for the game of BikeTag in {{ getGameName }}</h2>
      <bike-tag-map class="mt-5 mb-5" />
      <html-content class="about" filename="about-map.html" />
      <bike-tag-button class="m-5" text="See all BikeTag Posts" @click="goBikeTagsPage" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'
import BikeTagMap from '@/components/BikeTagMap.vue'

export default defineComponent({
  name: 'MapView',
  components: {
    HtmlContent,
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
    ...mapGetters(['getAllGames', 'getLogoUrl', 'getGameName']),
  },
  methods: {
    goBikeTagsPage() {
      this.$router.push('/biketags')
    },
  },
})
</script>
<style lang="scss" scoped>
@import '../assets/styles/style';

.about {
  align-items: center;
  font-family: $default-font-family;
  flex-flow: column nowrap;
  text-transform: uppercase;
}
</style>
