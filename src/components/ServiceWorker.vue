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
import { BikeTagEnv, debug } from '@/common'
import { useBikeTagStore } from '@/store/index'
import { useRegisterSW } from 'virtual:pwa-register/vue'

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
    if (BikeTagEnv.RELOAD_SW === 'true') {
      r &&
        setInterval(async () => {
          debug('worker::init', 'Checking for sw update')
          await r.update()
        }, 3000 /* 20s for testing purposes */)
    } else {
      debug('worker::init', 'registered: ' + r?.active)
    }
  },
})

const close = () => {
  offlineReady.value = false
  needRefresh.value = false
}

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
