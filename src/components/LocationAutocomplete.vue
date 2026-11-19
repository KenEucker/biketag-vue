<template>
  <span class="location-autocomplete">
    <input
      id="location-input"
      class="pac-target-input"
      type="text"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="location-options"
      :aria-expanded="suggestions.length > 0"
      :value="modelValue"
      :disabled="disabled"
      placeholder="Enter a location"
      @input="onInput"
      @keydown.down.prevent="moveSelection(1)"
      @keydown.up.prevent="moveSelection(-1)"
      @keydown.enter.prevent="selectActive"
      @keydown.esc="clearSuggestions"
      @blur="onBlur"
    />
    <span
      v-if="suggestions.length"
      id="location-options"
      class="location-autocomplete__options"
      role="listbox"
    >
      <button
        v-for="(place, index) in suggestions"
        :key="place.place_id || index"
        type="button"
        role="option"
        class="location-autocomplete__option"
        :aria-selected="index === selectedIndex"
        @mousedown.prevent
        @click="selectPlace(place)"
      >
        {{ place.display_name }}
      </button>
    </span>
    <span v-if="unavailable" class="location-autocomplete__status" role="status">
      Suggestions unavailable. Enter a location manually.
    </span>
    <a
      class="location-autocomplete__attribution"
      href="https://locationiq.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      Search by LocationIQ.com
    </a>
  </span>
</template>

<script setup name="LocationAutocomplete">
import { BikeTagEnv } from '@/common/constants';
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  searchCenter: { type: Object, default: null },
  postalCode: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'select'])
const suggestions = ref([])
const selectedIndex = ref(-1)
const unavailable = ref(false)
let timer
let blurTimer
let controller
let request = 0
let lastTyped = ''

// Bias results toward the game's location without excluding nearby ZIP codes.
// LocationIQ accepts viewbox as a preferred search area when bounded is false.
const getSearchViewbox = (center) => {
  const lat = Number(center?.lat)
  const lng = Number(center?.long ?? center?.lng)
  if (
    center?.lat == null ||
    (center?.long ?? center?.lng) == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 85 ||
    Math.abs(lng) > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null
  }

  const latRadius = 50 / 111.32 // Approximately 50 km from the game center
  const lngRadius = latRadius / Math.cos((lat * Math.PI) / 180)
  if (lng - lngRadius < -180 || lng + lngRadius > 180) return null
  return [lng - lngRadius, lat - latRadius, lng + lngRadius, lat + latRadius].join(',')
}

const clearSuggestions = () => {
  suggestions.value = []
  selectedIndex.value = -1
}

const cancelSearch = () => {
  clearTimeout(timer)
  controller?.abort()
  controller = undefined
  request += 1
}

const onInput = (event) => {
  lastTyped = event.target.value
  emit('update:modelValue', lastTyped)
  cancelSearch()
  clearSuggestions()
  unavailable.value = false
  const query = lastTyped.trim().slice(0, 200)
  if (props.disabled || !BikeTagEnv.LOQ_AKEY || query.length < 3) return

  const currentRequest = request
  timer = setTimeout(async () => {
    const pending = new AbortController()
    controller = pending
    try {
      const params = new URLSearchParams({
        key: BikeTagEnv.LOQ_AKEY,
        q: query,
        limit: '5',
      })
      const viewbox = getSearchViewbox(props.searchCenter)
      if (viewbox) {
        params.set('viewbox', viewbox)
        params.set('bounded', '0')
      }
      const response = await fetch('https://api.locationiq.com/v1/autocomplete?' + params, {
        signal: pending.signal,
      })
      if (!response.ok) throw new Error('LocationIQ autocomplete unavailable')
      const places = await response.json()
      if (currentRequest === request) {
        const validPlaces = Array.isArray(places)
          ? places.filter((place) => {
              const lat = Number(place?.lat)
              const lng = Number(place?.lon)
              return (
                place?.lat != null &&
                place?.lon != null &&
                Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                Math.abs(lat) <= 90 &&
                Math.abs(lng) <= 180 &&
                (lat !== 0 || lng !== 0) &&
                typeof place.display_name === 'string'
              )
            })
          : []
        const postalCode = props.postalCode?.trim().toUpperCase()
        if (postalCode) {
          const isLocal = (place) => {
            const resultCode = place.address?.postcode?.trim().toUpperCase()
            return resultCode === postalCode || resultCode?.startsWith(postalCode + '-')
          }
          validPlaces.sort((a, b) => Number(isLocal(b)) - Number(isLocal(a)))
        }
        suggestions.value = validPlaces
      }
    } catch (error) {
      if (currentRequest === request && error?.name !== 'AbortError') {
        unavailable.value = true
      }
    }
  }, 350)
}

const moveSelection = (direction) => {
  if (!suggestions.value.length) return
  selectedIndex.value =
    selectedIndex.value === -1
      ? direction > 0
        ? 0
        : suggestions.value.length - 1
      : (selectedIndex.value + direction + suggestions.value.length) % suggestions.value.length
}

const selectPlace = (place) => {
  const name = place.display_place?.trim() || place.display_name.split(',')[0].trim()
  emit('update:modelValue', name)
  emit('select', { lat: Number(place.lat), lng: Number(place.lon) })
  cancelSearch()
  clearSuggestions()
  unavailable.value = false
}

const selectActive = () => {
  if (selectedIndex.value >= 0) selectPlace(suggestions.value[selectedIndex.value])
}

const onBlur = () => {
  clearTimeout(blurTimer)
  blurTimer = setTimeout(clearSuggestions, 200)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value !== lastTyped) {
      cancelSearch()
      clearSuggestions()
    }
  },
)
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      cancelSearch()
      clearSuggestions()
    }
  },
)
watch(
  () => [props.searchCenter?.lat, props.searchCenter?.long ?? props.searchCenter?.lng, props.postalCode],
  () => {
    // Refresh an in-progress search if game information arrives after the player starts typing.
    if (lastTyped.trim().length >= 3) onInput({ target: { value: lastTyped } })
  },
)
onBeforeUnmount(() => {
  cancelSearch()
  clearTimeout(blurTimer)
})
</script>

<style lang="scss" scoped>
.location-autocomplete {
  // Keep the input and suggestion menu positioned against BikeTagInput's frame.
  display: contents;

  &__options {
    position: absolute;
    z-index: 1050;
    top: 4.5rem;
    left: 2rem;
    right: 0;
    max-height: 14rem;
    overflow-y: auto;
    background: white;
    border: 1px solid #aaa;
    box-shadow: 0 3px 8px rgb(0 0 0 / 20%);
  }

  &__option {
    display: block;
    width: 100%;
    border: 0;
    background: white;
    padding: 0.5rem;
    text-align: left;
    cursor: pointer;

    &:hover,
    &[aria-selected='true'] {
      background: #eee;
    }
  }

  &__attribution,
  &__status {
    position: absolute;
    right: 0.5rem;
    font-size: 0.65rem;
  }

  &__attribution {
    bottom: 0.2rem;
  }

  &__status {
    top: 4.5rem;
    z-index: 1050;
    background: white;
  }
}
</style>
