<template>
  <div :class="props.variant">
    <div v-if="!BikeTagEnv.LOQ_AKEY" class="leaflet-map leaflet-map--unavailable" role="status">
      Map tiles unavailable.
    </div>
    <div v-else ref="mapContainer" class="leaflet-map"></div>
    <p v-if="props.variant === 'play/input' && !inputPoint" class="leaflet-map__hint">
      Select a point on the map to place the pin.
    </p>
  </div>
</template>

<script setup name="BikeTagMap">
import Pin from '@/assets/images/pin.svg'
import { BikeTagEnv } from '@/common/constants'
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
let fittedRegionBounds = false
let gameCenterApplied = false
let regionRequest = 0
let resizeObserver
let inputMarker
let lastInputPoint

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
const gameCenter = computed(() => getMapPoint(getGame.value?.boundary))
const inputPoint = computed(
  () => getMapPoint(props.start) ?? getMapPoint(props.gps) ?? gameCenter.value,
)

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
  fittedRegionBounds = true
}

// The game loads after the map on a direct visit to /map. Center it when its
// boundary arrives, but don't override a region fit or a tag fit afterwards.
watch(gameCenter, (center) => {
  if (!map || !center || gameCenterApplied) return
  if (
    (props.variant === 'boundary' && !fittedRegionBounds) ||
    (props.variant === 'biketags' && !fittedTagBounds)
  ) {
    map.setView(center, cityZoom)
    gameCenterApplied = true
  }
})

const fitRegionBoundary = async () => {
  const request = ++regionRequest
  const region = getGame.value?.region
  if (!map || props.variant !== 'boundary' || !region?.description) return

  const regionData = await store.getRegionPolygon(region)
  if (map && request === regionRequest && regionData?.geojson) {
    addPolygons(regionData.geojson)
  }
}

// A region may not exist yet when the map mounts.
watch(() => getGame.value?.region?.description, fitRegionBoundary)

// Don't create an input marker at the default (0, 0) while GPS is missing.
const showInputPoint = (point) => {
  if (!map || !point) return
  if (lastInputPoint?.[0] === point[0] && lastInputPoint?.[1] === point[1]) return

  if (inputMarker) {
    inputMarker.setLatLng(point)
  } else {
    inputMarker = L.marker(point, {
      icon: new L.Icon({
        iconUrl: Pin,
        iconSize: [markerHeight, markerHeight],
        iconAnchor: [markerHeight / 2, markerHeight],
      }),
      draggable: true,
    }).addTo(map)
    inputMarker.on('dragend', (event) => {
      const { lat, lng } = event.target._latlng
      lastInputPoint = [lat, lng]
      emit('dragend', { lat, lng })
    })
  }

  lastInputPoint = point
  map.setView(point, playZoom)
}

watch(inputPoint, (point) => {
  if (props.variant === 'play/input') showInputPoint(point)
})

// mounted
onMounted(async () => {
  if (!BikeTagEnv.LOQ_AKEY) {
    console.warn('BikeTag map tiles unavailable: LOQ_AKEY is not configured')
    return
  }

  map = L.map(mapContainer.value).setView(gameCenter.value ?? centerNorthAmerica, worldZoom)
  // LocationIQ's Leaflet raster tiles; use the same public token as autocomplete.
  let reportedTileError = false
  L.tileLayer(
    `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${encodeURIComponent(BikeTagEnv.LOQ_AKEY)}`,
    {
      maxZoom: 20,
      subdomains: ['a', 'b', 'c'],
      attribution:
        '<a href="https://locationiq.com/?ref=maps" target="_blank" rel="noopener noreferrer">&copy; LocationIQ</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>',
    },
  )
    .on('tileerror', (event) => {
      if (!reportedTileError) {
        reportedTileError = true
        // Never log tile URLs: they include the public LocationIQ token.
        console.warn('BikeTag LocationIQ map tile failed to load', {
          variant: props.variant,
          zoom: event.coords?.z ?? null,
        })
      }
    })
    .addTo(map)

  // Leaflet can measure zero width when mounted in the Found Location popover.
  // Recalculate tile coverage when the container becomes visible or resizes.
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      if (entries.some(({ contentRect }) => contentRect.width > 0 && contentRect.height > 0)) {
        map?.invalidateSize({ pan: false })
      }
    })
    resizeObserver.observe(mapContainer.value)
  }

  if (props.variant == 'play/input') {
    L.control.locate().addTo(map)
    showInputPoint(inputPoint.value)
    map.on('click', (event) => {
      if (!inputMarker) {
        const { lat, lng } = event.latlng
        showInputPoint([lat, lng])
        emit('dragend', { lat, lng })
      }
    })
  } else if (props.variant == 'worldwide') {
    map.setView(centerNorthAmerica, worldZoom)
    markerLayer = L.featureGroup().addTo(map)
    syncMarkers()
  } else if (props.variant == 'boundary') {
    if (gameCenter.value) {
      map.setView(gameCenter.value, cityZoom)
      gameCenterApplied = true
    }
    await fitRegionBoundary()
  } else if (props.variant === 'biketags') {
    map.setView(gameCenter.value ?? centerNorthAmerica, cityZoom)
    gameCenterApplied = !!gameCenter.value
    L.control.locate().addTo(map)
    markerLayer = L.featureGroup().addTo(map)
    syncMarkers()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  inputMarker = undefined
  lastInputPoint = undefined
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

  &--unavailable {
    display: grid;
    place-items: center;
  }

  &__hint {
    margin-top: 0.25rem;
    font-size: 0.85rem;
  }
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
