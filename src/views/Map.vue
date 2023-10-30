<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container mt-5 mb-5">
    <div class="map d-flex justify-content-center">
      <h2>This is the boundary for the game of BikeTag in {{ getGameName }}</h2>
      <bike-tag-map class="biketags-map mt-5 mb-5" />
      <html-content class="about" filename="about-map.html" />
      <bike-tag-button class="m-5" text="See all BikeTag Posts" @click="goBikeTagsPage" />
      <h4>
        Experimental BikeTags Map!! <br />
        (if your tag shows up here it means we have the data for it)
      </h4>
      <bike-tag-map class="biketags-map mt-5 mb-5" variant="biketags" />
    </div>
  </div>
</template>

<script setup name="MapView">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index.ts'
// import StyledHr from '@/assets/images/hr.svg'
// import Pin from '@/assets/images/pin.svg'

// components
import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'

// data
// const styledHr = StyledHr
// const pin = Pin
const store = useStore()
const router = useRouter()

// computed
const getGameName = computed(() => store.getGameName)

// methods
function goBikeTagsPage() {
  router.push('/biketags')
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.map {
  align-items: center;
  font-family: $default-font-family;
  flex-flow: column nowrap;
  text-transform: uppercase;
}

.biketags-map {
  width: 100%;
  height: 500px;
}
</style>
