<template>
  <b-container class="col-8 col-lg-6">
    <span>{{ $t('pages.queue.found_title') }}</span>
    <div class="mt-3">
      <b-button class="w-100 btn-found border-0" @click="viewQueue">
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
    viewQueue() {
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
