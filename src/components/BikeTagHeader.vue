<template>
  <div class="container align-self-center">
    <div v-if="isShow" class="menu-btn p-2">
      <b-button class="btn-circle" variant="primary" @click="goBack">
        <i class="fa fa-long-arrow-alt-left" />
      </b-button>
    </div>
  </div>
  <div class="container mb-5">
    <div class="header-logo">
      <a href="./">
        <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
      </a>
      <div>
        <span class="game-title">{{ getGameTitle }}</span>
      </div>
    </div>
    <div>
      <b-button class="m-1" variant="primary" @click="goBikeTagsPage">
        {{ $t('menu.biketags') }}
      </b-button>
      <b-button class="m-1" variant="primary" @click="goQueuePage">
        {{ $t('menu.play') }} #<span>{{ getCurrentBikeTag.tagnumber }}</span>
      </b-button>
      <b-button class="m-1" variant="primary" @click="goHowPage">
        {{ $t('menu.howto') }}
      </b-button>
      <span
        v-if="getEasterEgg && playingEaster"
        class="fas fa-volume-mute"
        @click="muteEasterEgg"
      ></span>
      <div v-if="authLoading">
        <button v-if="!$auth.isAuthenticated.value" @click="login">{{ $t('menu.login') }}</button>
        <button v-if="$auth.isAuthenticated.value" @click="logout">{{ $t('menu.logout') }}</button>
      </div>
    </div>
    <audio id="biketag-jingle" ref="jingle">
      <source id="audioSource" :autoplay="playingEaster" type="audio/mpeg" :src="getEasterEgg" />
      Your browser does not support the audio element.
    </audio>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTagHeader',
  setup() {
    return {
      jingle: ref(null),
    }
  },
  data() {
    return {
      playingEaster: false,
    }
  },
  computed: {
    isShow() {
      return this.$route.name === 'Play' && !this.$route.params?.tagnumber?.length ? false : true
    },
    ...mapGetters(['getGameTitle', 'getLogoUrl', 'getCurrentBikeTag', 'getEasterEgg']),
    authLoading() {
      return typeof this.$auth !== 'undefined' && this.$auth?.loading && !this.$auth.loading.value
    },
  },
  async created() {
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    await this.$store.dispatch('setQueuedTags')
    await this.$store.dispatch('setPlayers')
  },
  methods: {
    login() {
      this.$auth.loginWithRedirect()
    },
    playEasterEgg(e) {
      e.preventDefault()
      e.stopPropagation()
      if (this.getEasterEgg) {
        document.getElementById('biketag-jingle').play()
        this.playingEaster = true
      }
    },
    playingNow() {
      this.playingEaster = true
    },
    muteEasterEgg(e) {
      e.preventDefault()
      e.stopPropagation()
      if (this.playingEaster) {
        document.getElementById('jingle').pause()
        this.playingEaster = false
      }
    },
    logout() {
      this.$auth.logout({
        returnTo: window.location.origin,
      })
    },
    goBikeTagsPage: function () {
      this.$router.push('/biketags')
    },
    goQueuePage: function () {
      this.$store.dispatch('setFormStepToJoin', true)
      this.$router.push('/queue')
    },
    goHowPage: function () {
      this.$router.push('/how')
    },
    goBack: function () {
      this.$router.back()
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
