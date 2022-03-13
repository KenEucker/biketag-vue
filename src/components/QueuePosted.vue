<template>
  <b-container class="queue-posted">
    <h3 class="queue-title">{{ $t('pages.round.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.posted_text') }}</p>
    <div class="mt-3">
      <bike-tag-button variant="medium" @click="goViewRound">
        {{ $t('pages.round.joined_button') }} #{{ getCurrentBikeTag?.tagnumber }}
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
    goViewRound() {
      this.$router.push('/round')
    },
  },
})
</script>
