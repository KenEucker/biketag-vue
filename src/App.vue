<template>
  <div class="spacer-top"></div>
  <bike-tag-menu variant="top" />
  <service-worker />
  <router-view />
  <bike-tag-menu variant="bottom" />
  <div class="spacer-bottom"></div>
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagMenu from '@/components/BikeTagMenu.vue'
import ServiceWorker from '@/components/ServiceWorker.vue'

export default defineComponent({
  name: 'App',
  components: {
    ServiceWorker,
    BikeTagMenu,
  },
  async created() {
    await this.$store.dispatch('setGame')
  },
})
</script>
<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  overflow: hidden;
}
.spacer-bottom {
  margin-bottom: 10rem;
}
.spacer-top {
  margin-top: 12rem;
}
</style>
