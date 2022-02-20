<template>
  <b-container class="queue-posted">
    <h3 class="queue-title">{{ $t('pages.queue.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.posted_text') }}</p>
    <div class="mt-3">
      <bike-tag-button variant="medium" @click="goViewQueue">
        {{ $t('pages.queue.joined_button') }} #{{ getCurrentBikeTag?.tagnumber }}
      </bike-tag-button>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default defineComponent({
  name: 'QueuePosted',
  components: {
    BikeTagButton,
  },
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
