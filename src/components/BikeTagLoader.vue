<template>
  <loading
    v-show="isLoading"
    v-model:active="isLoading"
    :is-full-page="isFullPage"
    :class="`realign-spinner ${customClass}`"
  >
    <img class="spinner" src= />
  </loading>
</template>
<script>
import { computed } from 'vue'

export default {
  name: 'BikeTagLoader',
  props: {
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
  },
  setup(props) {
    // computed
    const isLoading = computed(() => props.isShowing)

    return { isLoading }
  },
}
</script>
