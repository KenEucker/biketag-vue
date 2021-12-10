<template>
  <div class="container">
    <div v-if="getFormStep === 1">
      <queue-found :tag="getQueuedTag" />
    </div>
    <div v-if="getFormStep === 2">
      <queue-mystery :tag="getQueuedTag" />
    </div>
    <div v-if="getFormStep === 3">
      <submit-queued :tag="getQueuedTag" @submit="submit" />
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import SubmitQueued from '@/components/SubmitQueued.vue'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueFound,
    QueueMystery,
    SubmitQueued,
  },
  computed: {
    ...mapGetters(['getFormStep', 'getQueuedTag']),
  },
  methods: {
    prev() {
      this.step--
    },
    next() {
      this.step++
    },
    submit() {
      console.log('queueBikeTag::submit', this.getQueuedTag)
      alert('Submit to blah and show blah and etc.')
    },
  },
})
</script>
