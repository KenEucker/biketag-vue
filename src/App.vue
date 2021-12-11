<template>
  <bike-tag-header />
  <router-view />
  <bike-tag-footer />
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'

export default defineComponent({
  name: 'App',
  components: {
    BikeTagHeader,
    BikeTagFooter,
  },
  computed: {
    ...mapGetters(['getTitle', 'getLogoUrl']),
  },
  async mounted() {
    await this.$store.dispatch('setGame')
    await this.generateManifest()
  },
  methods: {
    async generateManifest() {
      const manifestLinkEl = document.querySelector('link[rel="manifest"]')

      if (manifestLinkEl) {
        const existingManifest = await fetch(manifestLinkEl.href)
        console.log({ existingManifest })
        const applicationManifest = {
          ...(await existingManifest.json()),
          name: this.getTitle,
          icons: [
            {
              src: this.getLogoUrl('h=192&w=192'),
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: this.getLogoUrl('h=512&w=512'),
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        }
        const blob = new Blob([JSON.stringify(applicationManifest)], { type: 'application/json' })
        manifestLinkEl.setAttribute('href', URL.createObjectURL(blob))
        console.log('dynamic application manifest', applicationManifest)
      }
    },
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
