<template>
  <div :class="props.variant">
    <div ref="mapContainer" class="leaflet-map"></div>
  </div>
</template>

<script setup name="BikeTagMap">
import Pin from '@/assets/images/pin.svg'
import { getImageSized } from '@/common/images'
import { useBikeTagStore } from '@/store/index'
import L from 'leaflet'
import 'leaflet.locatecontrol'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'
import 'leaflet/dist/leaflet.css'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
const markerHeight = 50
let map
let markerLayer
let fittedTagBounds = false

const getMapPoint = (gps) => {
  const coordinates = [gps?.lat, gps?.long ?? gps?.lng]
  if (
    coordinates.some(
      (value) =>
        !['number', 'string'].includes(typeof value) ||
        (typeof value === 'string' && !value.trim()),
    )
  ) {
    return null
  }
  const [lat, lng] = coordinates.map(Number)
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
    ? [lat, lng]
    : null
}

// computed
const getAllGames = computed(() => store.getAllGames)
const getLogoUrl = computed(() => store.getLogoUrl)
const getGame = computed(() => store.getGame)
const getTags = computed(() => store.getTags)
const getMarkers = computed(() =>
  props.variant === 'biketags'
    ? getTags.value.flatMap((tag) => {
        const point = getMapPoint(tag.gps)
        return point
          ? [
              {
                point,
                tag,
                logo: Pin,
                size: [markerHeight, markerHeight],
                anchor: [markerHeight / 2, markerHeight],
              },
            ]
          : []
      })
    : getAllGames.value
        .filter((game) => getMapPoint(game.boundary))
        .map((game) => ({
          point: getMapPoint(game.boundary),
          logo: getLogoUrl.value('', game.logo),
          size: ['auto', markerHeight],
          anchor: [0, markerHeight],
        })),
)

const mapContainer = ref(null)
const gameCenter = ref(centerNorthAmerica)

const createTagPopup = (tag) => {
  const popup = L.DomUtil.create('div', 'tag-map-popup')
  const link = L.DomUtil.create('a', 'tag-map-popup__title', popup)
  link.href = `/${tag.tagnumber}`
  link.textContent = `BikeTag #${tag.tagnumber}`
  if (tag.foundLocation) {
    const location = L.DomUtil.create('div', 'tag-map-popup__location', popup)
    location.textContent = tag.foundLocation
  }
  const photos = L.DomUtil.create('div', 'tag-map-popup__photos', popup)
  for (const [label, url] of [
    ['Mystery', tag.mysteryImageUrl],
    ['Found', tag.foundImageUrl],
  ]) {
    if (!url) continue
    const figure = L.DomUtil.create('figure', '', photos)
    const image = L.DomUtil.create('img', '', figure)
    image.alt = `${label} photo for BikeTag #${tag.tagnumber}`
    image.width = 116
    image.height = 90
    image.addEventListener(
      'error',
      () => {
        image.src = url
      },
      { once: true },
    )
    image.src = getImageSized(url, 's')
    const caption = L.DomUtil.create('figcaption', '', figure)
    caption.textContent = label
  }
  return popup
}

const syncMarkers = () => {
  if (!markerLayer) return
  markerLayer.clearLayers()
  for (const { point, logo, size, anchor, tag } of getMarkers.value) {
    const marker = L.marker(point, {
      ...(tag ? { title: `BikeTag #${tag.tagnumber}`, alt: `BikeTag #${tag.tagnumber}` } : {}),
      icon: new L.Icon({
        iconUrl: logo,
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor: [0, -markerHeight],
      }),
    }).addTo(markerLayer)
    if (tag) {
      marker.bindPopup(() => createTagPopup(tag), { maxWidth: 260 })
    }
  }
  if (props.variant === 'biketags' && getMarkers.value.length && !fittedTagBounds) {
    map.fitBounds(markerLayer.getBounds(), { padding: [30, 30], maxZoom: playZoom })
    fittedTagBounds = true
  }
}

watch(getMarkers, syncMarkers, { deep: true })

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
      icon: new L.Icon({
        iconUrl: Pin,
        iconSize: [markerHeight, markerHeight],
        iconAnchor: [markerHeight / 2, markerHeight],
      }),
      draggable: true,
    }).addTo(map)
    L.control.locate().addTo(map)
    map.setView(props.start, playZoom)
    marker.on('dragend', (e) => {
      emit('dragend', e.target._latlng)
    })
  } else if (props.variant == 'worldwide') {
    map.setView(centerNorthAmerica, worldZoom)
    markerLayer = L.featureGroup().addTo(map)
    syncMarkers()
  } else if (props.variant == 'boundary') {
    const regionData = await store.getRegionPolygon(getGame.value.region)
    if (regionData && map) {
      addPolygons(regionData?.geojson)
    }
  } else if (props.variant === 'biketags') {
    map.setView(gameCenter.value, cityZoom)
    L.control.locate().addTo(map)
    markerLayer = L.featureGroup().addTo(map)
    syncMarkers()
  }
})

onBeforeUnmount(() => {
  map?.remove()
  markerLayer = undefined
  map = undefined
})
</script>

<style lang="scss">
.tag-map-popup {
  width: 240px;
  max-width: 100%;
  text-transform: none;

  &__title {
    font-weight: bold;
  }

  &__location {
    margin-top: 4px;
    overflow-wrap: anywhere;
  }

  &__photos {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;

    figure {
      margin: 0;
    }

    img {
      width: 100%;
      height: 90px;
      object-fit: contain;
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/settings';

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
