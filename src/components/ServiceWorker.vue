<template>
  <div v-if="offlineReady || needRefresh" class="pwa-toast" role="alert">
    <div class="message">
      <span v-if="offlineReady"> App ready to work offline </span>
      <span v-else> New content available, click on reload button to update. </span>
    </div>
    <button v-if="needRefresh" @click="updateServiceWorker">Reload</button>
    <button @click="close">Close</button>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'ServiceWorker',
  props: {
    filename: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      offlineReady,
      needRefresh,
    }
  },
  computed: {
    ...mapGetters(['getGameSlug', 'getGameTitle', 'getLogoUrl']),
  },
  async created() {
    await this.$store.dispatch('setGame')
    const manifestLinkEl = document.querySelector('link[rel="manifest"]')

    if (manifestLinkEl) {
      const existingManifest = await fetch(manifestLinkEl.href)
      const applicationManifest = {
        ...(await existingManifest.json()),
        name: this.getGameTitle,
        id: this.getGameSlug,
        icons: [
          {
            src: await this.getLogoUrl('h=192&w=192'),
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: await this.getLogoUrl('h=512&w=512'),
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      }
      const blob = new Blob([JSON.stringify(applicationManifest)], { type: 'application/json' })
      manifestLinkEl.setAttribute('href', URL.createObjectURL(blob))
      console.log('app::application manifest updated', applicationManifest)
    }
  },
  methods: {
    close: async () => {
      offlineReady.value = false
      needRefresh.value = false
    },
    updateServiceWorker,
  },
})
</script>
<style lang="scss">
.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 16px;
  padding: 12px;
  border: 1px solid #8885;
  border-radius: 4px;
  z-index: 1;
  text-align: left;
  box-shadow: 3px 4px 5px 0 #8885;

  .message {
    margin-bottom: 8px;
  }

  button {
    border: 1px solid #8885;
    outline: none;
    margin-right: 5px;
    border-radius: 2px;
    padding: 3px 10px;
  }
}
</style>
