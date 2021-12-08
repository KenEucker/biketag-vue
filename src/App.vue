<template>
  <bike-tag-header />
  <router-view />
  <bike-tag-footer />
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'

export default defineComponent({
  name: 'App',
  components: {
    BikeTagHeader,
    BikeTagFooter,
  },
})
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

.card-body {
  border-radius: 0.25rem;
}
</style>
