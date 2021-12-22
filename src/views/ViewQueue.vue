<template>
  <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container">
    <div class="order-div">
      <div v-for="(tag, index) in getQueuedTags" :key="index" class="each-circle">
        <i class="fa fa-bicycle" />{{ index + 1 }}
      </div>
    </div>
    <div class="clock-div"><i class="far fa-clock" /> 14:23</div>
    <span class="tag-number">#{{ _tagnumber }}</span>
    <swiper :slides-per-view="1" :space-between="10">
      <swiper-slide v-for="(tag, index) in getQueuedTags" :key="index">
        <queued-tag
          :tagnumber="tag.tagnumber"
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
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import SwiperCore from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import QueuedTag from '@/components/QueuedTag.vue'

SwiperCore.use()
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
  data() {
    return {
      tagIsLoading: true,
    }
  },
  computed: {
    ...mapGetters(['getQueuedTags']),
  },
  created() {
    this.tagIsLoading = true
  },
  async mounted() {
    await this.$store.dispatch('setQueuedTags')
    this.tagIsLoading = false
  },
  methods: {
    goQueueImg2: function () {
      this.$router.push('/queueimg2')
    },
    goSubmitPage: function () {
      this.$router.push('/submittag')
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
.each-circle {
  width: 40px;
  height: 40px;
  margin: 5px;
  border-radius: 20px;
  border: 1px solid #000;
  display: flex;
  justify-content: center;
  align-items: center;
}
.order-div {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  /* border: 1px solid red; */
  color: #000;
}
.order-div > i {
  margin-right: 20px;
  font-size: 25px;
}
/* .location-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
} */
i {
  color: #000;
  font-size: 20px;
}
</style>
