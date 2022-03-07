<template>
  <div class="spacer-top"></div>
  <bike-tag-menu v-if="gameIsSet" variant="top" />
  <service-worker />
  <router-view />
  <bike-tag-menu v-if="gameIsSet" variant="bottom" />
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
  data() {
    return {
      gameIsSet: true,
    }
  },
  async created() {
    const game = await this.$store.dispatch('setGame')
    if (!game) {
      this.$router.push('/landing')
      this.gameIsSet = false
    }
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
