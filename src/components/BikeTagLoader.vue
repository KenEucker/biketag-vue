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
import { defineComponent } from 'vue'

export default defineComponent({
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
  computed: {
    isLoading() {
      return this.isShowing
    },
  },
  methods: {
    _linkText() {
      return this.linkText ?? this.link
    },
    buttonClick() {
      if (this.link.indexOf('://') !== -1) {
        window.location = this.link
      }
      this.$router.push({ path: this.link })
    },
  },
})
</script>
