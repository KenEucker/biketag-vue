<template>
  <div class="container mt-5">
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
        <div>
          <img class="img-fluid w-75" src="@/assets/images/bike1.webp" alt="how to biketag #1" />
        </div>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper3.text1') }}</p>
        <div class="mb-2">
          <img class="img-fluid w-50" src="@/assets/images/bike1.webp" alt="how to biketag #1" />
        </div>
        <div>
          <img
            class="img-fluid w-50 mb-5"
            src="@/assets/images/bike2.webp"
            alt="how to biketag #2"
          />
        </div>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper4.text1') }}</p>
        <div class="mb-3">
          <img class="img-fluid w-75" src="@/assets/images/bike3.webp" alt="how to biketag #3" />
        </div>
        <p>{{ $t('pages.howto.swiper4.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper5.text1') }}</p>
        <div class="mb-3">
          <img
            class="img-fluid w-75"
            src="@/assets/images/good-examples.webp"
            alt="how to biketag - good examples"
          />
        </div>
        <p>{{ $t('pages.howto.swiper5.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper6.text1') }}</p>
        <div class="mb-3">
          <img
            class="img-fluid w-75"
            src="@/assets/images/not-so-good-examples.webp"
            alt="how to biketag - not so good examples"
          />
        </div>
        <p>{{ $t('pages.howto.swiper6.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper7.text1') }}</p>
        <div class="mb-3">
          <img
            class="img-fluid w-50"
            src="@/assets/images/queue-tag.webp"
            alt="how to queue a biketag"
          />
        </div>
        <p>{{ $t('pages.howto.swiper7.text2') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper8.text1') }}</p>
        <div class="mb-3">
          <img
            class="img-fluid w-50"
            src="@/assets/images/submit-tag.webp"
            alt="how to submite a biketag"
          />
        </div>
        <p>{{ $t('pages.howto.swiper8.text2') }}</p>
        <p>{{ $t('pages.howto.swiper8.text3') }}</p>
      </swiper-slide>
      <swiper-slide>
        <p>{{ $t('pages.howto.swiper9.text1') }}</p>
        <bike-tag-map />
        <br />
        <p>{{ $t('pages.howto.swiper9.text2') }}</p>
      </swiper-slide>
    </swiper>
  </div>
</template>

<script setup name="HowToView">
// import Swiper core and required components
import SwiperCore, { Autoplay, Navigation, Pagination } from 'swiper'
// Import Swiper styles
import 'swiper/css/bundle'
import { ref, computed } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { debug } from '@/common/utils'

// components
import { Swiper, SwiperSlide } from 'swiper/vue'
import BikeTagMap from '@/components/BikeTagMap.vue'
import { useI18n } from 'vue-i18n'

// install Swiper components
SwiperCore.use([Autoplay, Navigation, Pagination])

// data
const playingEaster = ref(false)
const store = useBikeTagStore()
const { t } = useI18n()

// computed
const getEasterEgg = computed(() => store.getEasterEgg)

// methods
function playEasterEgg() {
  if (getEasterEgg.value) {
    document.getElementById('jingle').play().then(debug).catch(console.error)
    playingEaster.value = true
  }
}
</script>

<style scoped lang="scss">
.swiper {
  max-width: 600px;

  .swiper-slide {
    padding-top: 10px;

    p {
      line-height: 2vh;
    }
  }
}
</style>
