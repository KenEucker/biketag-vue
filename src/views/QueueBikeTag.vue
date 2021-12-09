<template>
  <div class="container">
    <div v-if="getFormStep === 1">
      <found-form />
    </div>
    <div v-if="getFormStep === 2">
      <mystery-form />
    </div>
    <div v-if="getFormStep === 3">
      <post-form />
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import FoundForm from '@/components/FoundForm.vue'
import MysteryForm from '@/components/MysteryForm.vue'
import PostForm from '@/components/PostForm.vue'

export default defineComponent({
  name: 'QueueBikeTag',
  components: {
    FoundForm,
    MysteryForm,
    PostForm,
  },
  computed: {
    ...mapGetters(['getFormStep']),
  },
  methods: {
    prev() {
      this.step--
    },
    next() {
      this.step++
    },
    submit() {
      alert('Submit to blah and show blah and etc.')
    },
  },
})
</script>
