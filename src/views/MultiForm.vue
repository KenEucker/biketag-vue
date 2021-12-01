<template>
  <div class="container">
    <form>
      <div v-if="step === 1">
        <step-one />
      </div>
      <div v-if="step === 2">
        <step-two />
      </div>
    </form>
  </div>
</template>
<script>
import { defineComponent } from 'vue'

import StepOne from '@/components/StepOne.vue'

export default defineComponent({
  components: {
    StepOne,
  },
  data() {
    return {
      step: 1,
      // registration: {
      //   name: null,
      //   email: null,
      //   street: null,
      //   city: null,
      //   state: null,
      //   numtickets: 0,
      //   shirtsize: 'XL',
      // },
    }
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
