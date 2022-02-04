<template>
  <b-container class="col-8 col-lg-6">
    <h3 class="queue-title">{{ $t('pages.queue.joined_title') }}</h3>
    <p class="queue-text">{{ $t('pages.queue.joined_text') }}</p>
    <div class="mt-3">
      <b-button class="w-75 btn-found border-0" @click="goViewQueue">
        {{ $t('pages.queue.joined_button') }}
      </b-button>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueueJoined',
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
    ...mapGetters(['getQueue', 'getQueuedTag']),
  },
  methods: {
    goViewQueue() {
      this.$store.dispatch('resetFormStep')
    },
  },
})
</script>
<style scoped lang="scss">
.btn-found {
  background-color: red;
}
</style>
