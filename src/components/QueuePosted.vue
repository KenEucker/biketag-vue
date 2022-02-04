<template>
  <b-container>
    <h3 class="queue-title">{{ $t('pages.queue.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.posted_text') }}</p>
    <div class="mt-3">
      <b-button class="w-75 btn-found border-0" @click="goViewQueue">
        {{ $t('pages.queue.joined_button') }} #{{ getCurrentBikeTag?.tagnumber }}
      </b-button>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueuePosted',
  computed: {
    ...mapGetters(['getCurrentBikeTag']),
  },
  methods: {
    goViewQueue() {
      this.$store.dispatch('resetFormStep')
    },
  },
})
</script>
