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
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'WorldwideView',
  data: () => ({
    myIframe: null,
  }),
  methods: {
    onLoad(frame) {
      this.myIframe = frame.contentWindow
    },
  },
})
</script>
