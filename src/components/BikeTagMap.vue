<template>
  <div :class="variant">
    <GMapMap
      v-if="variant === 'play/input'"
      :center="$props.start"
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
    <div v-else-if="variant === 'biketags'" class="game-map">
      <GMapMap :center="center" :zoom="10" map-type-id="roadmap">
        <template v-for="(tag, i) in getTags" :key="i">
          <template v-if="tag.gps.lat && tag.gps.long">
            <GMapMarker
              :id="`marker_${i}`"
              :icon="pinIcon"
              :position="{ lat: tag.gps.lat ?? 0, lng: tag.gps.long ?? 0 }"
              :clickable="true"
            />
            <b-popover :target="`marker_${i}`" triggers="hover" placement="top">
              <template #title> {{ `#${i}` }} by {{ tag.mysteryPlayer }}</template>
              <bike-tag-queue class="world-map__popover" :tag="tag" :show-number="false" />
            </b-popover>
          </template>
        </template>
      </GMapMap>
    </div>
    <div v-else-if="variant === 'worldwide'" class="world-map">
      <GMapMap :center="center" :zoom="4" map-type-id="roadmap">
        <GMapMarker
          v-for="(game, i) in getMarkers"
          :key="i"
          :icon="getLogoUrl('', game.logo)"
          :position="game.point"
        />
      </GMapMap>
    </div>
    <GMapMap v-else class="map" :click="true" :center="center" :zoom="11" map-type-id="terrain">
      <template v-if="multipolygon">
        <GMapPolygon v-for="(n_path, i) in paths" :key="i" :options="options" :paths="n_path" />
      </template>
      <GMapPolygon v-else :options="options" :paths="paths" />
    </GMapMap>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import Pin from '@/assets/images/pin.svg'

export default defineComponent({
  name: 'BikeTagMap',
  components: {
    BikeTagQueue,
  },
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
      case 'biketags':
        data = {
          pinIcon: Pin,
          center: { lat: 0, lng: 0 },
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
    ...mapGetters(['getAllGames', 'getLogoUrl', 'getGame', 'getTags']),
    getMarkers() {
      return this.getAllGames
        .filter((game) => game.boundary.lat != undefined) // add gps location to all games
        .map((game) => ({ point: game.boundary, logo: game.logo }))
    },
  },
  mounted() {
    if (this.$props.variant !== 'play/input') {
      this.center = {
        lat: this.getGame.boundary?.lat ?? 39.8283,
        lng: this.getGame.boundary?.lng ?? -98.5795,
      }
      if (this.$props.variant === 'biketags') {
        setTimeout(() => {
          const pins = document.querySelectorAll(".vue-map .gm-style div[role='button']")
          const triggers = document.querySelectorAll('.vue-map-hidden div')

          for (let i = 0; i < pins.length; i++) {
            triggers[i].style.height = '32px'
            triggers[i].o = {
              Iw: undefined,
              ni: undefined,
              opacity: 1,
              size: {
                h: undefined,
                height: 32,
                j: undefined,
                width: 32,
              },
              xn: true,
            }
            pins[i].insertBefore(triggers[i], pins[i].firstChild)
          }
        }, 2000)
      }
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
<style lang="scss">
.map {
  .game-map {
    &__popover {
      display: inline-flex;
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

.world-map,
.game-map {
  margin-top: 2.5rem;

  &__popover {
    display: inline-flex;
  }

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
