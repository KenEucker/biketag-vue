<template>
  <GMapMap
    v-if="variant === 'boundary'"
    class="map"
    :click="true"
    :center="center"
    :zoom="11"
    map-type-id="terrain"
  >
    <template v-if="multipolygon">
      <GMapPolygon v-for="(n_path, i) in paths" :key="i" :options="options" :paths="n_path" />
    </template>
    <GMapPolygon v-else :options="options" :paths="paths" />
  </GMapMap>
  <div v-else-if="variant === 'worldwide'" id="world-map">
    <GMapMap :center="center" :zoom="4" map-type-id="roadmap">
      <GMapMarker
        v-for="(game, i) in getMarkers"
        :key="i"
        :icon="getLogoUrl('', game.logo)"
        :position="game.point"
      />
    </GMapMap>
  </div>
  <GMapMap
    v-else-if="variant === 'play/input'"
    :center="$props.center"
    :zoom="18"
    map-type-id="roadmap"
  >
    <GMapMarker
      :icon="pinIcon"
      :position="gps"
      :draggable="true"
      :clickeable="true"
      @dragend="emitDragend"
    />
  </GMapMap>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Pin from '@/assets/images/pin.svg'

export default defineComponent({
  name: 'BikeTagMap',
  props: {
    variant: {
      type: String,
      default: 'boundary',
    },
    gps: {
      type: Object,
      default: null,
    },
    start: {
      type: Object,
      default: null,
    },
  },
  emits: ['dragend'],
  data() {
    let data = {}
    switch (this.variant) {
      case 'boundary':
        data = {
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
          center: { lat: 0, lng: 0 },
        }
        break
      case 'play/input':
        data = {
          pinIcon: Pin,
        }
        break
      case 'worldwide':
      default:
        data = {
          center: { lat: 0, lng: 0 },
        }
        break
    }
    return data
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl', 'getGame']),
    getMarkers() {
      return this.getAllGames
        .filter((game) => game.boundary.lat != undefined) // add gps location to all games
        .map((game) => ({ point: game.boundary, logo: game.logo }))
    },
  },
  mounted() {
    if (this.$props.variant !== 'play/input') {
      this.center = { lat: this.getGame.boundary.lat, lng: this.getGame.boundary.lng }
    }
  },
  async created() {
    if (this.$props.variant == 'boundary') {
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
    }
  },
  methods: {
    emitDragend(e) {
      this.$emit('dragend', e)
    },
  },
})
</script>
<style lang="scss" scoped>
@import '../assets/styles/style';

#world-map {
  margin-top: 2.5rem;

  .vue-map-container {
    margin: 0 auto;
    height: 500px;
  }
}

.map {
  width: 100%;
  height: 450px;
  @media (min-width: $breakpoint-tablet) {
    height: 650px;
  }
}
</style>
