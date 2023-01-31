<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="container" v-html="html" />
  <!--eslint-enable-->
</template>

<script setup name="HtmlContent">
import { defineProps, ref, onMounted } from 'vue'
import axios from 'axios'

// props
const props = defineProps({
  filename: {
    type: String,
    default: '',
  },
})

// data
const html = ref(String)

// mounted
onMounted(() => {
  axios.get('./' + props.filename).then((response) => (html.value = response.data))
})
</script>
