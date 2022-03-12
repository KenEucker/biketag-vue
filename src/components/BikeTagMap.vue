<template>
  <GMapMap class="map" :click="true" :center="center" :zoom="11" map-type-id="terrain">
    <template v-if="multipolygon">
      <GMapPolygon v-for="(n_path, i) in paths" :key="i" :options="options" :paths="n_path" />
    </template>
    <GMapPolygon v-else :options="options" :paths="paths" />
  </GMapMap>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTagMap',
  data() {
    return {
      center: { lat: 0, lng: 0 },
      multipolygon: false,
      paths: [],
      options: {
        strokeColor: '#08E059',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#7DFA11',
        fillOpacity: 0.35,
        clickable: false,
      },
    }
  },
  computed: {
    ...mapGetters(['getGame']),
  },
  async created() {
    const regionData = await this.$store.dispatch('getRegionPolygon', this.getGame.region)
    if (regionData) {
      this.center['lat'] = regionData.lat ? parseFloat(regionData.lat) : 0
      this.center['lng'] = regionData.lon ? parseFloat(regionData.lon) : 0
      this.multipolygon = regionData?.geojson?.type === 'MultiPolygon'
      if (this.multipolygon) {
        this.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return v.map((u) => {
            return { lng: u[0], lat: u[1] }
          })
        })
      } else {
        this.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return { lng: v[0], lat: v[1] }
        })
      }
    }
  },
})
</script>
<style lang="scss" scoped>
@import '../assets/styles/style';

.map {
  width: 100%;
  height: 450px;
  @media (min-width: $breakpoint-tablet) {
    height: 650px;
  }
}
</style>
