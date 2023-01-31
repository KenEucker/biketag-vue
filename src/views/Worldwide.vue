<!-- eslint-disable vue/multi-word-component-names -->
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

<script setup name="WorldwideView">
import { ref } from 'vue'

// data
const myIframe = ref(null)

// methods
function onLoad(frame) {
  myIframe.value = frame.contentWindow
}
</script>
