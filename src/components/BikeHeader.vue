<template>
  <div v-if="isShow" class="p-2">
    <b-button class="btn-circle" variant="primary" @click="goBack">
      <i class="fa fa-long-arrow-alt-left" />
    </b-button>
  </div>
  <div class="container mb-4">
    <div class="header--logo">
      <a href="./">
        <img :src="getLogoUrl" class="logo img-fluid" />
      </a>
      <div>
        <h1>{{ getTitle }}</h1>
      </div>
    </div>
    <div>
      <b-button class="m-1" variant="primary" @click="goArchivePage">ARCHIVE</b-button>
      <b-button class="m-1" variant="primary" @click="goSubmitTagPage">
        PLAY( <span>{{ getLastTag.tagnumber }}</span> )
      </b-button>
      <b-button class="m-1" variant="primary" @click="goHowPage">HOW</b-button>
    </div>
    <!-- <div class="main-img-clock-class" @click="goQueueImgPage">
      <i class="far fa-clock" />
    </div> -->
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'HeaderTemplate',
  computed: {
    isShow() {
      return this.$route.name === 'Home' ? false : true
    },
    ...mapGetters(['getTitle', 'getLogoUrl', 'getLastTag']),
  },
  mounted() {
    this.$store.dispatch('setGame')
    this.$store.dispatch('setLastTag')
  },
  methods: {
    goArchivePage: function () {
      this.$router.push('/archive')
    },
    goSubmitTagPage: function () {
      this.$router.push('/submittag')
    },
    goHowPage: function () {
      this.$router.push('/how')
    },
    goBack: function () {
      this.$router.push('/')
    },
    // goQueueImgPage: function () {
    //   this.$router.push('/queueimg')
    // },
  },
})
</script>
<style scoped>
.header--logo .logo {
  width: 8rem;
  height: 8rem;
  line-height: 8rem;
  margin: auto;
}
.bt-bicycle {
  background-size: cover;
  background-position: center;
}
.btn-circle {
  width: 40px;
  height: 40px;
  border-radius: 30px;
  display: flex;
  cursor: pointer;
  justify-content: center;
  align-items: center;
}
</style>
