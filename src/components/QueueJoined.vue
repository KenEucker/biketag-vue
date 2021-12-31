<template>
  <b-container class="col-8 col-lg-6">
    <span>{{ $t('pages.queue.found_title') }}</span>
    <div>
      <img :src="preview ?? '@/assets/images/blank.png'" class="img-fluid" />
    </div>

    <div class="mt-3">
      <b-button class="w-100 btn-found border-0" @click="goNextStep">
        {{ $t('pages.queue.create_mystery') }} &nbsp; <i class="fas fa-check-square" />
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
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
  },
})
</script>
<style scoped lang="scss">
.custom-file-upload {
  border-radius: 2rem;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
.click-me {
  cursor: pointer;
}
</style>
