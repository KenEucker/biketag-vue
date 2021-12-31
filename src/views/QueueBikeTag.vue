<template>
  <div class="container">
    <div
      v-if="
        getFormStep === BiketagFormSteps[BiketagFormSteps.joinQueue] ||
        getFormStep === BiketagFormSteps[BiketagFormSteps.queueFound]
      "
    >
      <queue-found :tag="getQueuedTag" />
    </div>
    <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.queueMystery]">
      <queue-mystery :tag="getQueuedTag" />
    </div>
    <div v-else-if="getFormStep === BiketagFormSteps[BiketagFormSteps.postTag]">
      <submit-queued :tag="getQueuedTag" @submit="submit" />
    </div>
    <bike-tag-queue :only-mine="true" />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import { BiketagFormSteps } from '@/store/index'

import QueueFound from '@/components/QueueFound.vue'
import QueueMystery from '@/components/QueueMystery.vue'
import SubmitQueued from '@/components/SubmitQueued.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'

export default defineComponent({
  name: 'QueueBikeTagView',
  components: {
    QueueFound,
    QueueMystery,
    SubmitQueued,
    BikeTagQueue,
  },
  data() {
    return {
      BiketagFormSteps,
    }
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
