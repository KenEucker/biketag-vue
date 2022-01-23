<template>
  <b-container>
    <span class="queue-title">{{ $t('pages.queue.posted_title') }}</span>
    <span class="queue-title">{{ $t('pages.queue.queue_posted') }}</span>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
// import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueuePosted',
})
</script>
