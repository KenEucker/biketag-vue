<template>
  <div id="netlify-modal"></div>
</template>

<script>
import { onMounted } from 'vue'
import netlifyIdentity from 'netlify-identity-widget'

export default {
  name: 'NetlifyIdentityWidget',
  setup() {
    // mounted
    onMounted(() => {
      netlifyIdentity.init({
        container: '#netlify-modal', // defaults to document.body
        APIUrl: 'https://biketag.org/.netlify/identity',
        logo: true,
        // locale: 'en', // defaults to 'en'
      })
      /// TODO: Uncomment this line to open up signups
      // netlifyIdentity.open('signup')
      /// TODO: Uncomment this line to open login modal
      // netlifyIdentity.open('login')
    })
  },
}
</script>
