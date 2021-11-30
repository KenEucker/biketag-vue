<template>
  <header-nav />
  <bike-header />
  <router-view />
  <bike-footer />
</template>
<script lang="ts">
import { defineComponent } from 'vue'
// import HeaderNav from '@/components/HeaderNav.vue'
import BikeHeader from '@/components/BikeHeader.vue'
import BikeFooter from '@/components/BikeFooter.vue'

export default defineComponent({
  name: 'App',
  components: {
    // HeaderNav,
    BikeHeader,
    BikeFooter,
  },
})
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  background-color: #f8f9fa;
}
.m-10 {
  margin: 10px;
}
.hidden {
  visibility: hidden;
  display: none;
}
.card-body {
  border-radius: 0.25rem;
}
</style>
