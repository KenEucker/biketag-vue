<template>
  <div class="container align-self-center">
    <div v-if="isShow" class="p-2">
      <b-button class="btn-circle" variant="primary" @click="goBack">
        <i class="fa fa-long-arrow-alt-left" />
      </b-button>
    </div>
  </div>
  <div class="container mb-4">
    <div class="header-logo">
      <a href="./">
        <img :src="getLogoUrl" class="logo img-fluid" />
      </a>
      <div>
        <span class="game-title">{{ getTitle }}</span>
      </div>
    </div>
    <div>
      <b-button class="m-1" variant="primary" @click="goBikeDexPage">BikeDex</b-button>
      <b-button class="m-1" variant="primary" @click="goQueuePage">
        PLAY( <span>{{ getCurrentBikeTag.tagnumber }}</span> )
      </b-button>
      <b-button class="m-1" variant="primary" @click="goHowPage">How-To</b-button>
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
  name: 'BikeTagHeader',
  computed: {
    isShow() {
      return this.$route.name === 'Play' ? false : true
    },
    ...mapGetters(['getTitle', 'getGame', 'getLogoUrl', 'getCurrentBikeTag']),
  },
  async mounted() {
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setCurrentBikeTag')
  },
  methods: {
    goBikeDexPage: function () {
      this.$router.push('/bikedex')
    },
    goQueuePage: function () {
      this.$router.push('/queue')
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
<style scoped lang="scss">
.header-logo .logo {
  width: 4rem;
  height: 6rem;
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
