<template>
  <div id="netlify-modal"></div>
</template>

<script>
import { defineComponent } from 'vue'
import netlifyIdentity from 'netlify-identity-widget'

export default defineComponent({
  name: 'NetlifyIdentityWidget',
  props: {},
  mounted() {
    netlifyIdentity.init({
      container: '#netlify-modal', // defaults to document.body
      APIUrl: 'https://netlify-identity-demo-vue.netlify.com/.netlify/identity',
      logo: true,
      // locale: 'en', // defaults to 'en'
    })
    // netlifyIdentity.open("signup")
  },
  methods: {},
})
</script>
