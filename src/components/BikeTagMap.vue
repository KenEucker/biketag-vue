<template>
  <div v-if="isGmapsEnabled()" :class="props.variant">
    <GMapMap
      v-if="props.variant === 'play/input'"
      :center="props.start"
      :zoom="18"
      map-type-id="roadmap"
    >
      <GMapMarker
        :icon="data.pinIcon"
        :position="props.gps"
        :draggable="true"
        :clickeable="true"
        @dragend="emitDragend"
      />
    </GMapMap>
    <div v-else-if="props.variant === 'biketags'" class="game-map">
      <GMapMap :center="data.center" :zoom="10" map-type-id="roadmap">
        <template v-for="(tag, i) in getTags" :key="i">
          <template v-if="tag.gps.lat && tag.gps.long">
            <GMapMarker
              :id="`marker_${i}`"
              :icon="data.pinIcon"
              :position="{ lat: tag.gps.lat ?? 0, lng: tag.gps.long ?? 0 }"
              :clickable="true"
            />
            <b-popover :target="`marker_${i}`" triggers="hover focus" placement="top">
              <template #title> {{ `#${i}` }} by {{ tag.mysteryPlayer }}</template>
              <bike-tag-queue class="world-map__popover" :tag="tag" :show-number="false" />
            </b-popover>
          </template>
        </template>
      </GMapMap>
    </div>
    <div v-else-if="props.variant === 'worldwide'" class="world-map">
      <GMapMap :center="data.center" :zoom="4" map-type-id="roadmap">
        <GMapMarker
          v-for="(game, i) in getMarkers"
          :key="i"
          :icon="getLogoUrl('', game.logo)"
          :position="game.point"
        />
      </GMapMap>
    </div>
    <GMapMap
      v-else
      class="map"
      :click="true"
      :center="data.center"
      :zoom="11"
      map-type-id="terrain"
    >
      <template v-if="data.multipolygon">
        <GMapPolygon
          v-for="(n_path, i) in data.paths"
          :key="i"
          :options="data.options"
          :paths="n_path"
        />
      </template>
      <GMapPolygon v-else :options="data.options" :paths="data.paths" />
    </GMapMap>
  </div>
</template>

<script setup name="BikeTagMap">
import { ref, computed, onMounted } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { isGmapsEnabled } from '@/common/utils'
import Pin from '@/assets/images/pin.svg'

// components
import BikeTagQueue from '@/components/BikeTagQueue.vue'

// props
const props = defineProps({
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
})

// data
const emit = defineEmits(['dragend'])
const data = ref({})
const store = useBikeTagStore()

switch (props.variant) {
  case 'boundary':
    data.value = {
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
    data.value = {
      pinIcon: Pin,
    }
    break
  case 'biketags':
    data.value = {
      pinIcon: Pin,
      center: { lat: 0, lng: 0 },
    }
    break
  case 'worldwide':
  default:
    data.value = {
      center: { lat: 0, lng: 0 },
    }
    break
}

// computed
const getAllGames = computed(() => store.getAllGames)
const getLogoUrl = computed(() => store.getLogoUrl)
const getGame = computed(() => store.getGame)
const getTags = computed(() => store.getTags)
const getMarkers = computed(() =>
  getAllGames.value
    .filter((game) => game.boundary.lat != undefined) // add gps location to all games
    .map((game) => ({ point: game.boundary, logo: game.logo })),
)

// methods
function emitDragend(e) {
  emit('dragend', e)
}

// created
async function created() {
  if (props.variant == 'boundary') {
    const regionData = await store.getRegionPolygon(getGame.value.region)
    if (regionData) {
      data.value.center['lat'] = regionData.lat ? parseFloat(regionData.lat) : 0
      data.value.center['lng'] = regionData.lon ? parseFloat(regionData.lon) : 0
      data.value.multipolygon = regionData?.geojson?.type === 'MultiPolygon'
      if (data.value.multipolygon) {
        data.value.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return v.map((u) => {
            return { lng: u[0], lat: u[1] }
          })
        })
      } else {
        data.value.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return { lng: v[0], lat: v[1] }
        })
      }
    }
  }
}
created()

// mounted
onMounted(() => {
  if (props.variant !== 'play/input') {
    data.value.center = {
      lat: getGame.value.boundary?.lat ?? 39.8283,
      lng: getGame.value.boundary?.lng ?? -98.5795,
    }
    if (props.variant === 'biketags') {
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
