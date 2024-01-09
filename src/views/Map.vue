<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container mt-5 mb-5">
    <div class="map d-flex justify-content-center">
      <h2>This is the boundary for the game of BikeTag in {{ getGameNameProper }}</h2>
      <bike-tag-map class="biketags-map" />
      <section-content class="about" filename="docs/about-map.html" />
      <h4>Map of all BikeTag locations in {{ getGameNameProper }}</h4>
      <bike-tag-map class="biketags-map mt-2 mb-5" variant="biketags" />
      <section-content class="about" filename="docs/about-map-2.html" />
      <bike-tag-button class="m-5" text="See all BikeTag Posts" @click="goBikeTagsPage" />
    </div>
  </div>
</template>

<script setup name="MapView">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
// import StyledHr from '@/assets/images/hr.svg'
// import Pin from '@/assets/images/pin.svg'

// components
import SectionContent from '@/components/SectionContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'

// data
// const styledHr = StyledHr
// const pin = Pin
const store = useBikeTagStore()
const router = useRouter()

// computed
const getGameNameProper = computed(() => store.getGameNameProper)

// methods
function goBikeTagsPage() {
  router.push('/biketags')
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.map {
  align-items: center;
  font-family: $default-secondary-font-family;
  font-size: $default-font-size;
  flex-flow: column nowrap;
  text-transform: uppercase;
}

.biketags-map {
  width: 100%;
  height: 500px;
  margin-top: 1vh;
  margin-bottom: 1vh;

  @media (min-width: $breakpoint-tablet) {
    margin-bottom: 15vh;
  }

  // @media (min-width: $breakpoint-laptop) {
  //   margin-bottom: 15vh;
  // }
}
</style>
