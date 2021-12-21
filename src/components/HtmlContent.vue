<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="container" v-html="html" />
  <!--eslint-enable-->
</template>
<script>
import { defineComponent } from 'vue'
import axios from 'axios'

export default defineComponent({
  name: 'HtmlContent',
  props: {
    filename: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      html: String,
    }
  },
  mounted() {
    axios.get('./' + this.filename).then((response) => (this.html = response.data))
  },
})
</script>
