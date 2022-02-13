<template>
  <div class="container align-self-center">
    <div v-if="isShow" class="menu-btn p-2">
      <b-button class="btn-circle" variant="primary" @click="goBack">
        <i class="fa fa-long-arrow-alt-left" />
      </b-button>
    </div>
  </div>
  <div class="container mt-2 mb-5">
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
      <b-button class="m-1" variant="primary" @click="goQueuePlay">
        {{ $t('menu.play') }}
        <span>{{
          !!getCurrentBikeTag?.tagnumber ? `#${getCurrentBikeTag.tagnumber + 1}` : ''
        }}</span>
      </b-button>
      <b-button
        v-if="getQueuedTags?.length && tagnumber === 0"
        class="btn-queue"
        @click="goQueueView"
      >
        <img class="bicon" src="../assets/images/SpinningBikeV1.svg" />
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
      <netlify-identity-widget />
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
import { GetQueryString } from '@/common/utils'
import NetlifyIdentityWidget from '@/components/NetlifyIdentityWidget.vue'

export default defineComponent({
  name: 'BikeTagHeader',
  components: {
    NetlifyIdentityWidget,
  },
  setup() {
    return {
      jingle: ref(null),
    }
  },
  data() {
    return {
      playingEaster: false,
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
    }
  },
  computed: {
    isShow() {
      return this.$route.name === 'Play' && !this.$route.params?.tagnumber?.length ? false : true
    },
    ...mapGetters([
      'getGameTitle',
      'getLogoUrl',
      'getCurrentBikeTag',
      'getQueuedTags',
      'getEasterEgg',
      'getMostRecentlyViewedTagnumber',
      'getGameName',
    ]),
    authLoading() {
      return typeof this.$auth !== 'undefined' && this.$auth?.loading && !this.$auth.loading.value
    },
  },
  mounted() {
    this.checkForNewBikeTagPost()
  },
  async created() {
    const btaId = GetQueryString(window, 'btaId')
    const expiry = GetQueryString(window, 'expiry')
    if (btaId && expiry) {
      this.$store.dispatch('setFormStepToApprove')
      this.$router.push('/play')
    }
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    await this.$store.dispatch('setQueuedTags')
    await this.$store.dispatch('setPlayers')
    this.checkForNewBikeTagPost()
  },
  methods: {
    checkForNewBikeTagPost() {
      if (
        this.getCurrentBikeTag.tagnumber > this.getMostRecentlyViewedTagnumber &&
        this.getMostRecentlyViewedTagnumber !== 0
      ) {
        console.log('ui::new biketag posted!!')
        this.$toast.open({
          message: `Round #${this.getCurrentBikeTag.tagnumber} of BikeTag ${this.getGameName} has been posted!`,
          type: 'default',
          position: 'top',
        })
      }
    },
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
    goQueuePlay: function () {
      this.$store.dispatch('setFormStepToJoin', true)
      this.$router.push('/play')
    },
    async goQueueView() {
      await this.$store.dispatch('resetFormStep')
      this.$router.push('/play')
    },
    goHowPage: function () {
      this.$router.push('/howtoplay')
    },
    goBack: function () {
      this.$router.back()
    },
  },
})
</script>
<style lang="scss" scoped>
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

.btn-queue {
  position: absolute;
  top: 0;
  right: -25px;
  z-index: 99;
  font-size: 1.25em;
  background-color: transparent !important;
  border-color: transparent !important;

  i {
    color: forestgreen;
    cursor: pointer;
    font-size: 4.5vh;
  }
}

.btn-queue {
  .bicon {
    max-height: 3.5em;
    animation: tronFilter 5s ease-in-out infinite alternate;
  }
}
</style>
