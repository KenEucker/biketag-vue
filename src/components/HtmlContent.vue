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
  watch: {
    $route() {
      axios.get('./' + this.$route.name + '.html').then((response) => (this.html = response.data))
    },
  },
  mounted() {
    axios.get('./' + this.$route.name + '.html').then((response) => (this.html = response.data))
  },
  // computed: {
  //   html() {
  //     return useStore(key).state.html
  //   },
  // },
  // mounted() {
  //   useStore(key).dispatch('getHtml')
  // },
})
</script>
<style scoped></style>
