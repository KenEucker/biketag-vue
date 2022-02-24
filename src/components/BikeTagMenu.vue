<template>
  <div v-if="variant === 'top">
    <!-- The header logo and profile and hamburger buttons go here -->
    <header class="biketag-header">
      <div class="biketag-header-nav">
        <img src="/public/images/Profile.svg" alt="Profile con" />
        <img src="/public/images/bike-tag-logo.svg" alt="Bike tag logo" />
        <img src="/public/images/Hamburger.svg" alt="Burge menu" />
      </div>
      <a href="./">
        <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
      </a>
      <span class="game-title">{{ getGameTitle }}</span>
    </header>
  </div>
  <div v-if="variant === 'bottom'">
    <!-- The footer nav buttons and link to homepage go here -->
  </div>
</template>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BikeTagMenu',
  props: {
    logo: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: 'top',
    },
  },
})
</script>
<style lang="scss" scoped>
</style>
