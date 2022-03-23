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
import { debug } from '@/common/utils'
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegistered(r) {
    if (process.env.RELOAD_SW === 'true') {
      r &&
        setInterval(async () => {
          debug('Checking for sw update')
          await r.update()
        }, 20000 /* 20s for testing purposes */)
    } else {
      debug('app::service worker registered', r?.active)
    }
  },
})
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
    try {
      const manifestLinkEl = document.querySelector('link[rel="manifest"]')

      if (manifestLinkEl) {
        const existingManifest = await fetch(manifestLinkEl.href)
        const applicationManifest = {
          ...(await existingManifest.json()),
          name: this.getGameTitle,
          id: this.getGameSlug,
          icons: [
            {
              src: await this.getLogoUrl('s'),
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: await this.getLogoUrl('l'),
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        }
        const blob = new Blob([JSON.stringify(applicationManifest)], { type: 'application/json' })
        manifestLinkEl.setAttribute('href', URL.createObjectURL(blob))
        debug('app::application manifest updated', applicationManifest)
      }
    } catch (e) {
      console.error('app::error loading manifest')
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
  text-align: left;
  box-shadow: 3px 4px 5px 0 #8885;
  z-index: 9999999999999;

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
