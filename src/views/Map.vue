<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <html-content filename="about-map.html" />
      <bike-tag-button text="Go see all BikeTag Posts" @click="goBikeTagsPage" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'

export default defineComponent({
  name: 'MapView',
  components: {
    HtmlContent,
    BikeTagButton,
  },
  data() {
    return {
      styledHr: StyledHr,
      pin: Pin,
    }
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl']),
  },
  methods: {
    goBikeTagsPage() {
      this.$router.push('/biketags')
    },
  },
})
</script>
