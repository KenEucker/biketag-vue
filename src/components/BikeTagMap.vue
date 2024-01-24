<template>
  <div :class="props.variant">
    <div ref="mapContainer" class="leaflet-map"></div>
  </div>
</template>

<script setup name="BikeTagMap">
import { ref, computed, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useBikeTagStore } from '@/store/index'
import Pin from '@/assets/images/pin.svg'
import 'leaflet.locatecontrol'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'

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
const store = useBikeTagStore()
const worldZoom = 3
const cityZoom = 10
const playZoom = 15
const centerNorthAmerica = [40, -45]
let map

// computed
const getAllGames = computed(() => store.getAllGames)
const getLogoUrl = computed(() => store.getLogoUrl)
const getGame = computed(() => store.getGame)
const getTags = computed(() => store.getTags)
const getMarkers = computed(() =>
  props.variant === 'biketags'
    ? getTags.value.map((t) => ({
        point: [t.gps.lat ?? 0, t.gps.long ?? t.gps.lng ?? 0],
        logo: Pin,
      }))
    : getAllGames.value
        .filter((game) => !!game.boundary.lat) // add gps location to all games
        .map((game) => ({ point: game.boundary, logo: getLogoUrl.value('', game.logo) })),
)

const mapContainer = ref(null)
const gameCenter = ref(centerNorthAmerica)

const LeafIcon = L.Icon.extend({
  options: {
    iconSize: ['auto', 50],
    iconAnchor: [0, 50],
  },
})

const MarkerIcon = L.Icon.extend({
  options: {
    iconSize: ['auto', 50],
    iconAnchor: [30, 50],
  },
})

const addMarkers = () => {
  for (let i = 0; i < getMarkers.value.length; i++) {
    L.marker(getMarkers.value[i].point, {
      icon: new LeafIcon({ iconUrl: getMarkers.value[i].logo }),
    }).addTo(map)
  }
}

const addPolygons = (paths) => {
  const polygon = L.geoJSON(paths, {
    style: function () {
      return {
        fillColor: 'blue',
        weight: 2,
        opacity: 0.7,
        color: 'white', //Outline color
        fillOpacity: 0.2,
      }
    },
  }).addTo(map)
  map.fitBounds(polygon.getBounds())
}

// mounted
onMounted(async () => {
  gameCenter.value = getGame.value.boundary
    ? [
        getGame.value.boundary?.lat ?? 0,
        getGame.value.boundary?.long ?? getGame.value.boundary?.lng ?? 0,
      ]
    : gameCenter.value
  map = L.map(mapContainer.value).setView(gameCenter.value, worldZoom)
  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0'],
  }).addTo(map)

  if (props.variant == 'play/input') {
    const marker = L.marker(props.start, {
      icon: new MarkerIcon({ iconUrl: Pin }),
      draggable: true,
    }).addTo(map)
    L.control.locate().addTo(map)
    map.setView(props.start, playZoom)
    marker.on('dragend', (e) => {
      emit('dragend', e.target._latlng)
    })
  } else if (props.variant == 'worldwide') {
    map.setView(centerNorthAmerica, worldZoom)
    if (getMarkers.value.length > 0) {
      addMarkers()
    } else {
      watch(
        () => getMarkers.value,
        () => {
          addMarkers()
        },
      )
    }
  } else if (props.variant == 'boundary') {
    const regionData = await store.getRegionPolygon(getGame.value.region)
    if (regionData) {
      addPolygons(regionData?.geojson)
    }
  } else if (props.variant === 'biketags') {
    if (getMarkers.value.length > 0) {
      map.setView(gameCenter.value, cityZoom)
      L.control.locate().addTo(map)
      addMarkers()
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

.leaflet-map {
  height: 500px;
}

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
