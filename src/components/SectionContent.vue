<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="container" v-html="html" />
  <markdown :source="mkdown" />
  <!--eslint-enable-->
</template>

<script setup name="SectionContent">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Markdown from 'vue3-markdown-it'

// props
const props = defineProps({
  filename: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    default: null,
  },
})

// data
const html = ref('')
const mkdown = ref('')

// mounted
onMounted(() => {
  if (props.content && !props.filename?.length) {
    mkdown.value = props.content
    return
  }

  axios.get('./' + props.filename).then((response) => {
    if (props.filename.lastIndexOf('.md') === props.filename.length - 3) {
      mkdown.value = response.data
    } else {
      html.value = response.data
    }
  })
})
</script>
