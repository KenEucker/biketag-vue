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

<script setup name="ServiceWorker">
import { computed } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { getSanityImageResizedSize } from '@/common/utils'
import { debug } from '@/common/utils'

// props
const props = defineProps({
  filename: {
    type: String,
    default: '',
  },
})

// data
// const emit = defineEmits(['manifestLoaded'])
const store = useBikeTagStore()
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

// computed
const getGameSlug = computed(() => store.getGameSlug)
const getGameTitle = computed(() => store.getGameTitle)

// methods
async function close() {
  offlineReady.value = false
  needRefresh.value = false
}

// created
async function created() {
  /// TODO: remove this extra call and ensure that the manifest is still being created
  await store.setGame()
  try {
    const manifestLinkEl = document.querySelector('link[rel="manifest"]')

    if (manifestLinkEl) {
      const existingManifest = await fetch(manifestLinkEl.href)
      const slugIsSet = !!getGameSlug.value?.length
      const smallLogo = await store.getLogoUrl('s', undefined, true)
      const bigLogo = await store.getLogoUrl('l', undefined, true)

      const applicationManifest = {
        ...(await existingManifest.json()),
        name: getGameTitle.value.toLowerCase(),
        id: `${slugIsSet ? `${getGameSlug.value}.` : ''}biketag`,
        description: `The game of BikeTag ${
          slugIsSet ? `in ${getGameSlug.value}` : ''
        } - BikeTag is a photo mystery tag game played on bicycles. No login required.`,
        start_url: window.location.origin,
        scope: window.location.origin,
        icons: [
          {
            src: smallLogo[0] === '/' ? `${window.location.origin}${smallLogo}` : smallLogo,
            sizes: smallLogo[0] === '/' ? '321x638' : getSanityImageResizedSize(smallLogo),
            type: 'image/webp',
          },
          {
            src: bigLogo[0] === '/' ? `${window.location.origin}${bigLogo}` : bigLogo,
            sizes: bigLogo[0] === '/' ? '321x638' : getSanityImageResizedSize(bigLogo),
            type: 'image/webp',
            purpose: 'maskable any',
          },
          // {
          //   src: `${window.location.origin}/maskable_icon_x512.png`,
          //   sizes: '512x512',
          //   type: 'image/png',
          //   purpose: 'maskable',
          // },
        ],
      }
      const blob = new Blob([JSON.stringify(applicationManifest)], { type: 'application/json' })
      manifestLinkEl.setAttribute('href', URL.createObjectURL(blob))
      debug('app::application manifest updated', applicationManifest)
    }
  } catch (e) {
    console.error('app::error loading manifest')
  }
}
created()
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
