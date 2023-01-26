<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="container" v-html="html" />
  <!--eslint-enable-->
</template>
<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'HtmlContent',
  props: {
    filename: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const html = ref(String)

    // mounted
    onMounted(() => {
      axios.get('./' + props.filename).then((response) => (html.value = response.data))
    })

    return {
      html,
    }
  },
}
</script>
