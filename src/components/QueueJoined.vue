<template>
  <b-container class="queue-joined col-md-8 col-lg-8">
    <h3 class="queue-title">{{ $t('pages.queue.joined_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.joined_text') }}</p>
    <div class="mt-3">
      <bike-tag-button @click="goMysteryQueue">
        {{ $t('pages.queue.mystery_button') }}
      </bike-tag-button>
      <bike-tag-button variant="medium" @click="goViewQueue">
        {{ $t('pages.queue.joined_button') }} {{ getCurrentBikeTag?.tagnumber }}
      </bike-tag-button>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default defineComponent({
  name: 'QueueJoined',
  components: {
    BikeTagButton,
  },
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data: function () {
    return {
      preview: null,
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getQueuedTag', 'getCurrentBikeTag']),
  },
  methods: {
    goViewQueue() {
      this.$store.dispatch('resetFormStep')
    },
    goMysteryQueue() {
      this.$store.dispatch('setFormStepToJoin', true)
    },
  },
})
</script>
<style scoped lang="scss">
.btn-mystery {
  background-color: blue;
}
</style>
