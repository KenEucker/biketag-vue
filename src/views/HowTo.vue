<template>
  <div class="container">
    <swiper
      :slides-per-view="1"
      :space-between="0"
      navigation
      loop="true"
      @swiper="onSwiper"
      @slide-change="onSlideChange"
    >
      <swiper-slide>
        <p class="ms-4 me-4">
          BIKETAG IS A PHOTO TAG GAME WHERE YOU FIND A MYSTERY LOCATION IN THE REAL WORLD BY
          BICYCLE. TO PLAY THE GAME YOU NEED YO UNDERSTAND THESE THREE THINGS:<br />
          1) IMAGES OF BIKES AND UNIQUE THNIGS TOGETHER ARE WHAT WE CALL "BIKETAGS"<br />
          2) THE OBJECT OF THE GAME IS TO FIND AND CREATE WHAT WE CALL "MYSTERY LOCATIONS"<br />
          3) THE GAME NEVER ENDS AND EVERY ROUND IS A NEW CHANCE TO PLAY THE GMAE.
        </p>
      </swiper-slide>
      <swiper-slide>
        <div>
          THE PLACE WHERE THE MOST RECENT BIKETAG WAS MADE IS CALLED THE "MYSTERY LOCATION".
        </div>
        <div>IN THIS EXAMPLE, AN ORANGE-COLORED BIKE IS SHOWN:</div>
      </swiper-slide>
      <swiper-slide>
        <div>
          ONCE YOU ARRIVE AT THE MYSTERY LOCATION YOU MUST CREATE A MATCHING BIKETAG IMAGE OF YOUR
          OWN. IN THIS EXAMPLE, YOU ARE THE BLUE COLORED BIKE:
        </div>
      </swiper-slide>
      <swiper-slide>
        <div>NEXT, IT'S TIME TO RIDE TO A NEW MYSTERY LOCATION AND MAKE A NEW BIKETAG.</div>
        <div>KEEP IN MIND, GOOD MYSTERY LOCATIONS HELP PROGRESS THE GAME.</div>
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
