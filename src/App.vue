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
<style lang="scss">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  overflow: hidden;
}
.spacer-bottom {
  margin-bottom: 8rem;
}
.spacer-top {
  margin-top: 8rem;
}
@media (min-width: 550px) {
  .spacer-top {
    margin-top: 12rem;
  }
}
</style>
