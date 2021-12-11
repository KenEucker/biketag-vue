<template>
  <div class="container">
    <swiper
      :autoplay="{ delay: 15000 }"
      :pagination="{ clickable: true }"
      :slides-per-view="1"
      :space-between="50"
      navigation
      :loop="true"
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
      <swiper-slide>
        <p>
          GREAT MYSTERY LOCATIONS HAVE UNIQUE, INTERESTING, AND IDENTIFIABLE THINGS. THINK ABOUT
          WHERE YOU WANT TO GO AND CHOOSE WISELY TO KEEP THE GAME RUNNING SMOOTHLY.
        </p>
        <div class="mb-3">
          <img class="img-fluid w-75" src="@/assets/images/good-examples.png" />
        </div>
        <p>
          GREAT EXAMPLES INCLUDE CREATED OBJECTS LIKE MURALS AND BUILDINGS, AND PERMANENT OBJECTS
          LIKE LANDMARKS AND NATURAL FEATURES.
        </p>
      </swiper-slide>
      <swiper-slide>
        <p>
          NOT-SO-GREAT MYSTERY LOCATIONS ARE FEATURELESS, OBSCURE, AND ARE INACCESSIBLE. THEY
          SHOULDN’T BE HARD TO FIND. DON’T CREATE A BIKETAG THAT IS UNSAFE FOR OTHERS.
        </p>
        <div class="mb-3">
          <img class="img-fluid w-75" src="@/assets/images/not-so-good-examples.png" />
        </div>
        <p>
          NOT-SO-GREAT EXAMPLES INCLUDE TEMPORARY AND MOVING OBJECTS LIKE FOOD TRUCKS AND GRAFFITI,
          PLAIN OBJECTS LIKE CONCRETE WALLS, AND PRIVATE PROPERTY THAT WOULD REQUIRE TRESPASSING.
        </p>
      </swiper-slide>
      <swiper-slide>
        <p>
          ONCE YOU HAVE THE IMAGES READY FOR THE CURRENT MYSTERY LOCATION YOU CAN SUBMIT THEM HERE
        </p>
        <div class="mb-3">
          <img class="img-fluid w-50" src="@/assets/images/queue-tag.png" />
        </div>
        <p>PRESS THE PLAY BUTTON AND BEGIN YOUR NEW TAG SUBMISSION</p>
      </swiper-slide>
      <swiper-slide>
        <p>
          AFTER ADDING YOUR FOUND AND NEW MYSTERY IMAGES, YOU CAN SUBMIT THE TAG TO BE POSTED FOR
          THE NEXT ROUND!
        </p>
        <div class="mb-3">
          <img class="img-fluid w-50" src="@/assets/images/submit-tag.png" />
        </div>
        <p>THE TERMS OF USE OF THE BIKETAG APP ARE OUTLINED IN THE BIKETAG CODE OF CONDUCT</p>
        <p>IMAGES YOU PROVIDE WILL BE PUBLICLY AVAILABLE ON THE INTERNET</p>
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

// install Swiper components
SwiperCore.use([Autoplay, Navigation, Pagination])

// Import Swiper styles
export default {
  name: 'HowToView',
  components: {
    Swiper,
    SwiperSlide,
  },
}
</script>
<style scoped lang="scss">
.swiper {
  max-width: 600px;
}

.swiper-slide p {
  text-align: left;
  line-height: 4vh;
}
</style>
