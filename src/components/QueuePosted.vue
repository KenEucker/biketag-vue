<template>
  <b-container>
    <h3 class="queue-title">{{ $t('pages.queue.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.posted_text') }}</p>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
// import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueuePosted',
})
</script>
