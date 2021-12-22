<template>
  <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="Round-root">
    <div class="location-btn">
      <div class="order-div">
        <div v-for="(tag, index) in getQueuedTags" :key="index" class="each-circle1">
          <i class="fa fa-bicycle" />{{ index + 1 }}
        </div>
      </div>
    </div>
    <div class="main-img-clock-class"><i class="far fa-clock" /> 14:23</div>
    <div>
      <div class="img-all-class">
        <div class="img-title-class">#365</div>
        <div class="each-img-class">
          <img src="" />
          <div class="st-class">1st</div>
        </div>
        <div class="img-title-class">Queued by u/kiriska</div>
        <div class="img-subtitle-class">0 minutes 38 seconds ago</div>
      </div>
    </div>
    <b-button class="how" @click="goSubmitPage">Join the queue!</b-button>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'ViewQueue',
  components: {
    Loading,
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
.logo-img {
  margin-bottom: 20px;
}
.st-class {
  position: absolute;
  color: white;
  text-shadow: 2px 2px #292828e6;
  background: rgba(0, 0, 0, 0.75);
  font-size: 25px;
  width: 50px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  font-weight: bold;
  top: 5px;
  left: 5px;
}
.img-subtitle-class {
  color: white;
  text-align: center;
}
.main-img-clock-class {
  color: white;
  display: flex;
  align-items: center;
  font-size: 20px;
  margin-bottom: 20px;
}
.main-img-clock-class > i {
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
  border: 1px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}
.each-circle1 {
  width: 40px;
  height: 40px;
  margin: 5px;
  border-radius: 20px;
  border: 1px solid #fff;
  background: grey;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}
.order-div {
  width: 80%;
  display: flex;
  align-items: center;
  height: 40px;
  cursor: pointer;
  margin-top: 20px;
  justify-content: center;
  font-size: 18px;
  border-radius: 7px;
  /* border: 1px solid red; */
  color: #fff;
}
.how {
  background: forestgreen !important;
  margin-top: 60px;
}
.order-div > i {
  margin-right: 20px;
  font-size: 25px;
}
.location-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}
.each-img-class > img {
  width: 100%;
  /* border: 1px solid red; */
  height: 200px;
}
.each-img-class {
  width: 100%;
  position: relative;
  /* border: 1px solid red; */
}
.img-title-class {
  color: #fff;
  width: 100%;
  text-align: center;
  font-size: 30px;
  margin: 15px 0;
}
.Round-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 10px;
}
.queue-header {
  /* border: 1px solid red; */
  display: flex;
  align-items: center;
  width: 100%;
}
.go-out {
  width: 40px;
  height: 40px;
  border-radius: 30px;
  background: darkviolet;
  display: flex;
  cursor: pointer;
  margin-right: 20px;
  justify-content: center;
  align-items: center;
}
i {
  color: #fff;
  font-size: 20px;
}
</style>
