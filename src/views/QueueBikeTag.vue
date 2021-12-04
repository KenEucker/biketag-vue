<template>
  <b-spinner v-show="loading" />
  <div v-show="!loading" class="container">
    <form>
      <div v-if="getFormStep === 1">
        <found-form />
      </div>
      <div v-if="getFormStep === 2">
        <mystery-form />
      </div>
      <div v-if="getFormStep === 3">
        <post-form />
      </div>
    </form>
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
  data() {
    return {
      loading: true,
    }
  },
  computed: {
    ...mapGetters(['getFormStep']),
  },
  // data() {
  //   return {
  //step: 1,
  // registration: {
  //   name: null,
  //   email: null,
  //   street: null,
  //   city: null,
  //   state: null,
  //   numtickets: 0,
  //   shirtsize: 'XL',
  // },
  //   }
  // },
  mounted() {
    this.loading = false
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
