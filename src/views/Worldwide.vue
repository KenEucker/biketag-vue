<template>
  <vue-iframe
    src="https://biketag.org"
    frame-id="my-ifram"
    name="my-frame"
    width="150px"
    height="200px"
    @load="onLoad"
  />
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'WorldwideView',
  setup() {
    const myIframe = ref(null)

    // methods
    function onLoad(frame) {
      myIframe.value = frame.contentWindow
    }

    return { onLoad }
  },
}
</script>
