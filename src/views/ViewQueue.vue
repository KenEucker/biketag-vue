<template>
  <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container">
    <div class="bike-pagination">
      <img
        v-for="(tag, index) in getQueuedTags"
        :key="index"
        class="bike-pagination-bullet"
        :src="tag.foundImageUrl"
      />
    </div>
    <div class="clock-div mt-2">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <span class="tag-number">#{{ _tagnumber }}</span>
    <swiper :pagination="{ clickable: true }" :slides-per-view="1" :space-between="10">
      <swiper-slide v-for="(tag, index) in getQueuedTags" :key="index">
        <queued-tag
          :tag-order="index + 1"
          :found-image-url="tag.foundImageUrl"
          :found-player="tag.foundPlayer"
          :player="tag.foundPlayer"
          size="l"
        />
      </swiper-slide>
    </swiper>
    <b-button @click="goSubmitPage">Join the queue!</b-button>
  </div>
</template>

<script>
import { defineComponent, watchEffect, onMounted } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import { useTimer } from 'vue-timer-hook'
import SwiperCore, { Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import QueuedTag from '@/components/QueuedTag.vue'

SwiperCore.use([Pagination])
// import { useI18n } from 'vue-i18n'
// import type { MessageSchema } from '@/i18n/schemas'

export default defineComponent({
  name: 'ViewQueue',
  components: {
    Loading,
    Swiper,
    SwiperSlide,
    QueuedTag,
  },
  setup() {
    const time = new Date()
    time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
    const timer = useTimer(time)
    // const restartFive = () => {
    //   // Restarts to 5 minutes timer
    //   const time = new Date()
    //   time.setSeconds(time.getSeconds() + 300)
    //   timer.restart(time)
    // }
    onMounted(() => {
      watchEffect(async () => {
        if (timer.isExpired.value) {
          console.warn('IsExpired')
        }
      })
    })
    return {
      timer,
    }
  },
  data() {
    return {
      countDown: 10,
      tagIsLoading: true,
    }
  },
  computed: {
    ...mapGetters(['getQueuedTags']),
    _tagnumber() {
      if (this.tagIsLoading) return 0
      else return this.getQueuedTags[0].tagnumber
    },
  },
  created() {
    this.tagIsLoading = true
    this.countDownTimer()
  },
  async mounted() {
    await this.$store.dispatch('setQueuedTags')
    this.tagIsLoading = false
  },
  methods: {
    goSubmitPage: function () {
      this.$router.push('/submittag')
    },
    countDownTimer() {
      if (this.countDown > 0) {
        setTimeout(() => {
          this.countDown -= 1
          this.countDownTimer()
        }, 1000)
      }
    },
  },
})
</script>
<style scoped>
.clock-div > i {
  color: forestgreen;
  cursor: pointer;
  font-size: 25px;
  margin-right: 10px;
}
.tag-number {
  /* position: absolute;
  top: -1em; */
  transform: rotate(3deg);
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  padding: 0 1.5rem;
}
.bike-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  /* border: 1px solid red; */
  color: #000;
}
.bike-pagination-bullet {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  margin: 5px;
  border-radius: 5rem;
  cursor: pointer;
}
.bike-pagination > i {
  margin-right: 20px;
  font-size: 25px;
}
i {
  color: #000;
  font-size: 20px;
}
.swiper-pagination {
  position: absolute;
  top: 10px;
  right: 10px;
  width: auto !important;
  left: auto !important;
  margin: 0;
}
.swiper-pagination-bullet {
  padding: 5px 10px;
  border-radius: 0;
  width: auto;
  height: 30px;
  text-align: center;
  line-height: 30px;
  font-size: 12px;
  color: #000;
  opacity: 1;
  background: rgba(0, 0, 0, 0.2);
}
.swiper-pagination-bullet-active {
  color: #fff;
  background: #007aff;
}
</style>
