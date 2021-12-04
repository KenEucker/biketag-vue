<template>
  <div class="Round-root">
    <div class="location-letter">New Mystery Location</div>
    <div class="queue-img">
      <div class="main-header">This is what your post will look like</div>
      <div class="main-body-img-div">
        <div class="tag366-div">Bike Tag #366</div>
        <div class="tag366-img"><img src="@/assets/images/Roundback.png" /></div>
        <div class="tag366-div1">Tag #366 by Ken</div>
        <div class="tag366-img1"><img src="@/assets/images/Roundback.png" /></div>
        <div class="tag366-div1">
          Tag #365 found at (DT)<br />
          by Ken
        </div>
      </div>
    </div>
    <div class="queue-found-tag">
      Post New Tag To Reddit For Me <i class="fas fa-check-square" />
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
  name: 'PostReddit',
  methods: {
    gobefore: function () {
      this.$router.push('/queue')
    },
    gomain: function () {
      this.$router.push('/')
    },
  },
})
</script>
<style scoped>
.logo-img {
  margin: 20px;
}
.tag366-img > img,
.tag366-img1 > img {
  width: 200px;
  height: 100px;
}
.tag366-img1 {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  /* height: 150px; */
}
.tag366-div {
  font-size: 20px;
  font-weight: bold;
  margin: 15px;
}
.tag366-div1 {
  font-size: 20px;
  font-weight: bold;
  margin: 15px;
  display: flex;
  width: 95%;
  text-align: right;
  justify-content: flex-end;
}
.main-body-img-div {
  border: 1px solid greenyellow;
  margin-top: 10px;
  height: 370px;
}
.main-header {
  font-size: 20px;
  text-align: center;
  font-weight: 500;
}
.yourname-bottom {
  width: 70%;
  text-align: center;
}
.bottom-letter {
  width: 95%;
  margin-top: 10px;
  text-align: center;
}
.queue-found-tag {
  width: 100%;
  height: 50px;
  display: flex;
  margin-top: 40px;
  background: deeppink;
  justify-content: center;
  cursor: pointer;
  position: relative;
  font-size: 15px;
  border-radius: 7px;
  align-items: center;
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
}
.true-location-btn > i {
  margin-right: 20px;
  font-size: 25px;
}
.location-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
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
.location-letter {
  font-size: 20px;
}
.queue-img {
  /* border: 1px solid red; */
  margin-top: 40px;
  width: 90%;
  height: 400px;
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
