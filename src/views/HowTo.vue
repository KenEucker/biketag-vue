<template>
  <div class="container">
    <swiper
      :autoplay="{ delay: 12500 }"
      :pagination="{ clickable: true }"
      :slides-per-view="1"
      :space-between="10"
      navigation
      :loop="true"
    >
      <audio id="jingle" ref="jingle">
        <source id="audioSource" type="audio/mpeg" :src="getEasterEgg" />
        {{ $t('pages.howto.browser_not_support_audio') }}
      </audio>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper1.text1') }}</p>
        <p>
          {{ $t('pages.howto.swiper1.text2') }}
          <span
            v-if="getEasterEgg && !playingEaster"
            class="fas fa-volume-down"
            @click="playEasterEgg"
          ></span>
        </p>
        <br />
        <p>{{ $t('pages.howto.swiper1.text3') }}</p>
        <br />
        <p>{{ $t('pages.howto.swiper1.text4') }}</p>
        <br />
        <p>{{ $t('pages.howto.swiper1.text5') }}</p>
        <br />
        <p>{{ $t('pages.howto.swiper1.text6') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper2.text1') }}</p>
        <p>{{ $t('pages.howto.swiper2.text2') }}</p>
        <div><img class="img-fluid w-75" src="@/assets/images/bike1.png" /></div>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper3.text1') }}</p>
        <div class="mb-2"><img class="img-fluid w-50" src="@/assets/images/bike1.png" /></div>
        <div><img class="img-fluid w-50 mb-5" src="@/assets/images/bike2.png" /></div>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper4.text1') }}</p>
        <div class="mb-3"><img class="img-fluid w-75" src="@/assets/images/bike3.png" /></div>
        <p>{{ $t('pages.howto.swiper4.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper5.text1') }}</p>
        <div class="mb-3">
          <img class="img-fluid w-75" src="@/assets/images/good-examples.png" />
        </div>
        <p>{{ $t('pages.howto.swiper5.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper6.text1') }}</p>
        <div class="mb-3">
          <img class="img-fluid w-75" src="@/assets/images/not-so-good-examples.png" />
        </div>
        <p>{{ $t('pages.howto.swiper6.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper7.text1') }}</p>
        <div class="mb-3">
          <img class="img-fluid w-50" src="@/assets/images/queue-tag.png" />
        </div>
        <p>{{ $t('pages.howto.swiper7.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper8.text1') }}</p>
        <div class="mb-3">
          <img class="img-fluid w-50" src="@/assets/images/submit-tag.png" />
        </div>
        <p>{{ $t('pages.howto.swiper8.text2') }}</p>
        <p>{{ $t('pages.howto.swiper8.text3') }}</p>
      </swiper-slide>
    </swiper>
  </div>
</template>
<script>
// import Swiper core and required components
import SwiperCore, { Autoplay, Navigation, Pagination } from 'swiper'

// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue'

// Import Swiper styles
import 'swiper/css/bundle'

import { mapGetters } from 'vuex'

// install Swiper components
SwiperCore.use([Autoplay, Navigation, Pagination])

// Import Swiper styles
export default {
  name: 'HowToView',
  components: {
    Swiper,
    SwiperSlide,
  },
  data() {
    return {
      playingEaster: false,
    }
  },
  computed: {
    ...mapGetters(['getGameSlug', 'getEasterEgg']),
  },
  mounted() {
    this.$store.dispatch('setGame')
  },
  methods: {
    playEasterEgg() {
      if (this.getEasterEgg) {
        document.getElementById('jingle').play().then(console.log).catch(console.error)
        this.playingEaster = true
      }
    },
  },
}
</script>
<style scoped lang="scss">
.swiper {
  max-width: 600px;
}

.swiper-slide {
  p {
    line-height: 3vh;
  }
}
</style>
