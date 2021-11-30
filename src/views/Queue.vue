<template>
  <div class="Round-root">
    <span class="location-letter">Queue Found Location</span>
    <div class="queue-img"><img src="@/assets/images/Roundback.png" /></div>
    <div class="queue-btns">
      <md-button class="md-raised md-primary queue-photo">Photos</md-button>
      <md-button class="md-fab md-plain">
        <i class="fa fa-camera" />
      </md-button>
      <md-button class="md-raised md-primary queue-photo">Switch</md-button>
    </div>
    <div class="location-btn">
      <div class="true-location-btn"><i class="fa fa-map-marked-alt" />enter found location</div>
    </div>
    <div class="queue-found-tag" @click="FoundTag">
      Queue Found Tag <i class="fas fa-check-square" />
    </div>
    <div class="bottom-letter">
      Uploading to BideTag. Org requires that you agree to the terms and conditions set by the
      BikeTag Project
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'QueuePage',
  data() {
    return {
      boolean: true,
    }
  },
  computed: {},
  methods: {
    FoundTag: function () {
      this.$router.push('/Queued')
    },
    goRoundPage: function () {
      this.$router.push('/')
    },
  },
})
</script>
<style scoped>
.logo-img {
  margin: 20px;
}
.bottom-letter {
  color: #fff;
  width: 95%;
  margin-top: 10px;
  text-align: center;
}
.queue-found-tag {
  width: 100%;
  height: 50px;
  display: flex;
  margin-top: 60px;
  background: forestgreen;
  justify-content: center;
  cursor: pointer;
  position: relative;
  font-size: 20px;
  border-radius: 7px;
  align-items: center;
  color: #fff;
}
.queue-found-tag > i {
  margin-left: 20px;
  position: absolute;
  font-size: 30px;
  right: 20px;
}
.true-location-btn {
  width: 70%;
  display: flex;
  align-items: center;
  height: 40px;
  cursor: pointer;
  margin-top: 20px;
  justify-content: center;
  font-size: 18px;
  border-radius: 7px;
  background: forestgreen;
  color: #fff;
}
.true-location-btn > i {
  margin-right: 20px;
  font-size: 25px;
}
.location-btn {
  width: 100%;
  display: flex;
  justify-content: center;
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
  background: #75a3a3;
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
.location-letter {
  font-size: 20px;
}
.queue-img {
  /* border: 1px solid red; */
  margin-top: 40px;
  height: 250px;
}
.queue-img > img {
  height: 100%;
}
.queue-btns {
  /* border: 1px solid red; */
  margin-top: 10px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.queue-photo {
  background: forestgreen !important;
}
</style>
