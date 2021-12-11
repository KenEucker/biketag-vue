<template>
  <div class="container align-self-center">
    <div v-if="isShow" class="menu-btn p-2">
      <b-button class="btn-circle" variant="primary" @click="goBack">
        <i class="fa fa-long-arrow-alt-left" />
      </b-button>
    </div>
  </div>
  <div class="container mb-3">
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
    ...mapGetters(['getTitle', 'getLogoUrl', 'getCurrentBikeTag']),
  },
  async mounted() {
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setCurrentBikeTag')
    switch (this.$route.name) {
      case 'Tag':
      case 'Play':
      case 'BikeDex':
        await this.$store.dispatch('setTags')
        break
      case 'Player':
      case 'Players':
        await this.$store.dispatch('setPlayers')
        break
      case 'Leaderboard':
        await this.$store.dispatch('setTopPlayers')
        break
    }
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
  },
})
</script>
<style scoped lang="scss">
.header-logo .logo {
  width: auto;
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

.menu-btn {
  position: absolute;
}
</style>
