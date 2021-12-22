<template>
  <div class="container">
    <div v-if="getFormStep === 1">
      <queue-found :tag="getQueuedTag" />
    </div>
    <div v-else-if="getFormStep === 2">
      <queue-mystery :tag="getQueuedTag" />
    </div>
    <div v-else-if="getFormStep === 3">
      <submit-queued :tag="getQueuedTag" @submit="submit" />
    </div>
    <div>
      <b-button class="navigation" @click="reset">
        <img class="img-fluid" :src="getCurrentBikeTag.mysteryImageUrl" />
      </b-button>
      <img class="navigation" />
      <img class="navigation" />
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
    ...mapGetters(['getCurrentBikeTag', 'getFormStep', 'getQueuedTag']),
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
    reset() {
      this.$store.dispatch('setQueuedTag', {})
      this.$store.dispatch('resetFormStep')
    },
  },
})
</script>
<style lang="scss" scoped>
.navigation {
  width: 40px;
  height: 40px;
  margin: 10px;
  padding: 0;
  cursor: pointer;
  border: 0;
  border-radius: 5rem;
  img {
    width: 40px;
    height: 40px;
    border-radius: 5rem;
  }
}
</style>
