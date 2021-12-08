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
  updated() {
    this.$nextTick(function () {
      axios.get('./' + this.$route.name + '.html').then((response) => (this.html = response.data))
    })
  },
  created() {
    this.$nextTick(function () {
      axios.get('./' + this.$route.name + '.html').then((response) => (this.html = response.data))
    })
  },
})
</script>
<style scoped lang="scss"></style>
