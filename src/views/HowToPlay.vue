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
        <GMapMap class="map" :click="true" :center="center" :zoom="11" map-type-id="terrain">
          <template v-if="multipolygon">
            <GMapPolygon v-for="(n_path, i) in paths" :key="i" :options="options" :paths="n_path" />
          </template>
          <GMapPolygon v-else :options="options" :paths="paths" />
        </GMapMap>
      </swiper-slide>
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
      center: { lat: 0, lng: 0 },
      multipolygon: false,
      paths: [],
      options: {
        strokeColor: '#08E059',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#7DFA11',
        fillOpacity: 0.35,
        clickable: false,
      },
    }
  },
  computed: {
    ...mapGetters(['getGameSlug', 'getEasterEgg', 'getGame']),
  },
  async created() {
    const regionData = await this.$store.dispatch('getRegionPolygon', this.getGame.region)
    if (regionData) {
      this.center['lat'] = regionData.lat ? parseFloat(regionData.lat) : 0
      this.center['lng'] = regionData.lon ? parseFloat(regionData.lon) : 0
      this.multipolygon = regionData?.geojson?.type === 'MultiPolygon'
      if (this.multipolygon) {
        this.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return v.map((u) => {
            return { lng: u[0], lat: u[1] }
          })
        })
      } else {
        this.paths = regionData?.geojson?.coordinates[0].map((v) => {
          return { lng: v[0], lat: v[1] }
        })
      }
    }
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

  .swiper-slide {
    padding-top: 10px;

    p {
      line-height: 2vh;
    }
  }
}

.map {
  height: 80%;
}
</style>
