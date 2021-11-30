<template>
  <div class="Round-root">
    <div class="location-btn">
      <div class="order-div">
        <div class="each-circle" @click="goQueueImg"><i class="fa fa-bicycle" />1</div>
        -
        <div class="each-circle1"><i class="fa fa-bicycle" />2</div>
        -
        <div class="each-circle">3</div>
        -
        <div class="each-circle">4</div>
        -
        <div class="each-circle">5</div>
      </div>
    </div>
    <div class="main-img-clock-class"><i class="far fa-clock" /> 12:20</div>
    <div>
      <div class="img-all-class">
        <div class="img-title-class">#365</div>
        <div class="each-img-class">
          <img src="@/assets/images/Roundback.png" />
          <div class="st-class">2nd</div>
        </div>
        <div class="img-title-class">Queued by Ken</div>
        <div class="img-subtitle-class">0 minutes 20 seconds ago</div>
      </div>
    </div>
    <md-button class="md-raised md-primary how" @click="goSubmitPage">Join the queue!</md-button>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  data() {
    return {
      boolean: true,
    }
  },
  computed: {},
  methods: {
    gobefore: function () {
      this.$router.push('/')
    },
    goQueueImg: function () {
      this.$router.push('/queueimg')
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
  text-align: center;
}
.main-img-clock-class {
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
  height: 200px;
}
.each-img-class {
  width: 100%;
  position: relative;
}
.img-title-class {
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
  font-size: 20px;
}
</style>
