<template>
  <!-- eslint-disable vue/no-v-html -->
  <p v-if="error" role="alert">Unable to load this content. Please try again.</p>
  <div class="container" v-html="html" />
  <markdown :source="mkdown" />
  <!--eslint-enable-->
</template>

<script setup name="SectionContent">
import { ref, watch } from 'vue'
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
const error = ref(false)

watch(
  () => [props.filename, props.content],
  async ([filename, content], _previous, onCleanup) => {
    let active = true
    onCleanup(() => (active = false))
    html.value = ''
    mkdown.value = ''
    error.value = false

    if (!filename) {
      mkdown.value = content ?? ''
      return
    }

    try {
      const response = await axios.get('/' + filename.replace(/^\/+/, ''))
      if (!active) return
      if (filename.endsWith('.md')) {
        mkdown.value = response.data
      } else {
        html.value = response.data
      }
    } catch {
      if (active) error.value = true
    }
  },
  { immediate: true },
)
</script>
