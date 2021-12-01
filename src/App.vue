<template>
  <header-nav />
  <bike-header />
  <router-view />
  <bike-footer />
</template>
<script>
import { defineComponent } from 'vue'
import BikeHeader from '@/components/BikeHeader.vue'
import BikeFooter from '@/components/BikeFooter.vue'

export default defineComponent({
  name: 'App',
  components: {
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
.card-body {
  border-radius: 0.25rem;
}
</style>
