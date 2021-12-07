<template>
  <div class="container">
    <swiper
      :pagination="{ clickable: true }"
      :slides-per-view="1"
      :space-between="0"
      navigation
      loop="true"
      @swiper="onSwiper"
      @slide-change="onSlideChange"
    >
      <swiper-slide>
        <p>
          BIKETAG IS A PHOTO TAG GAME WHERE YOU FIND A MYSTERY LOCATION IN THE REAL WORLD BY
          BICYCLE.
        </p>
        <p>TO PLAY THE GAME YOU NEED YO UNDERSTAND THESE THREE THINGS:</p>
        <p>1) IMAGES OF BIKES AND UNIQUE THNIGS TOGETHER ARE WHAT WE CALL "BIKETAGS"</p>
        <p>2) THE OBJECT OF THE GAME IS TO FIND AND CREATE WHAT WE CALL "MYSTERY LOCATIONS"</p>
        <p>3) THE GAME NEVER ENDS AND EVERY ROUND IS A NEW CHANCE TO PLAY THE GMAE.</p>
      </swiper-slide>
      <swiper-slide>
        <p>THE PLACE WHERE THE MOST RECENT BIKETAG WAS MADE IS CALLED THE "MYSTERY LOCATION".</p>
        <p>IN THIS EXAMPLE, AN ORANGE-COLORED BIKE IS SHOWN:</p>
        <div><img class="img-fluid w-75" src="@/assets/images/bike1.png" /></div>
      </swiper-slide>
      <swiper-slide>
        <p>
          ONCE YOU ARRIVE AT THE MYSTERY LOCATION YOU MUST CREATE A MATCHING BIKETAG IMAGE OF YOUR
          OWN. IN THIS EXAMPLE, YOU ARE THE BLUE COLORED BIKE:
        </p>
        <div class="mb-2"><img class="img-fluid w-50" src="@/assets/images/bike1.png" /></div>
        <div><img class="img-fluid w-50 mb-5" src="@/assets/images/bike2.png" /></div>
      </swiper-slide>
      <swiper-slide>
        <p>NEXT, IT'S TIME TO RIDE TO A NEW MYSTERY LOCATION AND MAKE A NEW BIKETAG.</p>
        <div class="mb-3"><img class="img-fluid w-75" src="@/assets/images/bike3.png" /></div>
        <p>KEEP IN MIND, GOOD MYSTERY LOCATIONS HELP PROGRESS THE GAME.</p>
      </swiper-slide>
    </swiper>
  </div>
</template>
<script>
// import Swiper core and required components
import SwiperCore, { Navigation, Pagination, A11y } from 'swiper'

// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/scrollbar'

// install Swiper components
SwiperCore.use([Navigation, Pagination, A11y])

// Import Swiper styles
export default {
  components: {
    Swiper,
    SwiperSlide,
  },
  methods: {
    onSwiper(swiper) {
      console.log(swiper)
    },
    onSlideChange() {
      console.log('slide change')
    },
  },
}
</script>
<style scoped>
.swiper {
  max-width: 600px;
}
.swiper-slide p {
  text-align: left;
  line-height: 4vh;
}
</style>
