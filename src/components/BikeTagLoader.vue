<template>
  <loading
    v-show="isLoading"
    v-model:active="isLoading"
    :is-full-page="props.isFullPage"
    :class="`realign-spinner ${props.customClass}`"
  >
    <img class="spinner" src="" />
  </loading>
</template>

<script setup name="BikeTagLoader">
import { computed } from 'vue'

// props
const props = defineProps({
  loaderImage: {
    type: String,
    default: '@/assets/images/SpinningBikeV1.svg',
  },
  isShowing: {
    type: Boolean,
    default: true,
  },
  isFullPage: {
    type: Boolean,
    default: true,
  },
  customClass: {
    type: Boolean,
    default: null,
  },
})

// computed
const isLoading = computed(() => props.isShowing)
</script>
