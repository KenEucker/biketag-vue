<template>
  <nav class="navbar navbar-expand-lg">
    <div class="container container-fluid">
      <div v-if="isShow" class="nav-item">
        <bike-tag-button class="btn-circle" variant="circle" @click="goBack">
          <img
            src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzknIGhlaWdodD0nMjUnIHZpZXdCb3g9JzAgMCAzOSAyNScgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTQuNDUzMzcgOS42NDMzMUgzMi40NTM0JyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMi42NDM0QzEzLjI1MyAxMS4xMDA2IDQ2LjAyOTMgMTAuNjQzNCAzNS4xMiAxMC42NDM0QzMwLjc0MDcgMTAuNjQzNCA3LjE4NjUgOC4xNzcxIDUuNDUzMzcgMTEuNjQzNCcgc3Ryb2tlPSdibGFjaycgc3Ryb2tlLXdpZHRoPScyJyBzdHJva2UtbGluZWNhcD0ncm91bmQnLz4KPHBhdGggZD0nTTEzLjQ1MzQgMS42NDMyNUMxMi4wNTEyIDMuODg2NzMgMTAuNTA5MiA2LjA3MTUzIDguODk3ODMgOC4xNDMyNUM3Ljc4NTY5IDkuNTczMTQgNS40MDQ2MyA5LjI3NDg3IDQuNjc1NjEgMTAuODY1NUMzLjEyMDkyIDE0LjI1NzUgLTAuMzI1NTA2IDEyLjI4ODEgMy41MDg5NCAxNS42NDMyQzUuNTU4OSAxNy40MzcgNy43MzYyMSAxOC45MjYxIDkuNjc1NiAyMC44NjU1QzEzLjEwMjcgMjQuMjkyNiAxMS4xOTg3IDIzLjU3NzEgOC42NzU2IDIwLjY0MzJDNi4zMDQwMyAxNy44ODU2IDIuOTUwNjQgMTQuOTY1NSAxLjE3NTYxIDExLjgwOTlDMC4wNDYyMTQzIDkuODAyMTEgNC42ODczOCA3LjQ1MDIxIDUuODk3ODMgNi42NDMyNUM3LjMxOTIyIDUuNjk1NjUgMTUuMDExNSAtMS4wODYzOSAxMi4wMDg5IDEuNjQzMjVDOS4zMDkzOCA0LjA5NzM5IDQuNjI2OTUgNy4yNDg3OCAzLjIzMTE2IDEwLjQyMUMyLjQwMjM0IDEyLjMwNDcgLTAuMDMxMzczNSAxMi4zNjE5IDIuMDA4OTQgMTQuNTg3N0MzLjIxODc2IDE1LjkwNzUgNC43NjMyMSAxNi4yNzA2IDUuOTUzMzggMTcuNjk4OEM3LjgxNjg4IDE5LjkzNSAxMC40MDY2IDIyLjY0MzIgMTMuNDUzNCAyMi42NDMyJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMS42NDMzQzUuNzUzNDIgMTQuMjIxNSAxMS42NDY4IDE5LjAzMDEgMTMuNDUzNCAyMi42NDMzJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8L3N2Zz4K"
            alt="go back"
          />
          <!-- <i class="fa back-button fa-long-arrow-alt-left" /> -->
        </bike-tag-button>
      </div>

      <div class="navbar-brand header-logo nav-item">
        <a href="./">
            <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
          </a>
        <div>
          <span class="game-title">{{ getGameTitle }}</span>
        </div>
      </div>

      <bike-tag-button 
        text="X" class="btn-circle navbar-toggler" variant="circle"
        data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" 
        aria-controls="navbarSupportedContent" aria-expanded="false" 
        aria-label="Toggle navigation" style="max-width: 4rem"
        >
        <span class="navbar-toggler-icon"></span>
      </bike-tag-button>

      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <bike-tag-button class="m-1" :text="$t('menu.about')" @click="goAboutPage" />
          </li>
          <li class="nav-item">
            <bike-tag-button class="m-1" :text="$t('menu.players')" @click="goUsersPage" />
          </li>
          <li class="nav-item">
            <bike-tag-button class="m-1" :text="$t('menu.top10')" @click="goLeaderboardPage" />
          </li>
          <li class="nav-item">
            <bike-tag-button :text="$t('menu.biketags')" @click="goBikeTagsPage" />
          </li>
          <li class="nav-item">
            <bike-tag-button variant="bold" :text="$t('menu.play')" @click="goQueuePlay" />
          </li>
          <li class="nav-item">
            <bike-tag-button :text="$t('menu.howto')" @click="goHowPage" />
          </li>
          <li class="nav-item">
          <template v-if="showAuth && !authLoading">
            <li class="nav-item">
              <bike-tag-button v-if="$auth.isAuthenticated" :text="$t('menu.profile')" @click="goProfile" />
            </li>
            <li class="nav-item">
              <bike-tag-button v-if="!$auth.isAuthenticated" :text="$t('menu.login')" @click="login" />
            </li>
            <li class="nav-item">
              <bike-tag-button v-if="$auth.isAuthenticated" :text="$t('menu.logout')" @click="logout" />
            </li>
          </template>
          </li>
          <li class="nav-item" v-if="getEasterEgg && playingEaster">
            <netlify-identity-widget />
          </li>
        </ul>
      </div>
    </div>
      
      
      
      <bike-tag-button
        v-if="getQueuedTags?.length && tagnumber === 0"
        class="btn-queue bike-btn navbar-item"
        variant="circle"
        @click="goQueueView"
      >
        <img class="spinning-bike" src="../assets/images/SpinningBikeV1.svg" />
      </bike-tag-button>
      
      <span  v-if="getEasterEgg && playingEaster" 
        class="fas fa-volume-mute" @click="muteEasterEgg"></span>
      <audio id="biketag-jingle" ref="jingle">
        <source id="audioSource" :autoplay="playingEaster" type="audio/mpeg" :src="getEasterEgg" />
        Your browser does not support the audio element.
      </audio>
      
  </nav>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import { GetQueryString } from '@/common/utils'
import NetlifyIdentityWidget from '@/components/NetlifyIdentityWidget.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default defineComponent({
  name: 'BikeTagHeader',
  components: {
    NetlifyIdentityWidget,
    BikeTagButton,
  },
  setup() {
    return {
      jingle: ref(null),
    }
  },
  data() {
    return {
      playingEaster: false,
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0
    }
  },
  computed: {
    showAuth() {
      return true
    },
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
      'isBikeTagAmbassador',
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
      this.$router.push('/login')
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
    goProfile: function() {
      this.$router.push('/profile')
    },
    goAboutPage: function () {
      this.$router.push('/about')
    },
    goLeaderboardPage: function () {
      this.$router.push('/leaderboard')
    },
    goUsersPage: function () {
      this.$router.push('/players')
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


.bike-btn {
  background-size: unset !important;
}

.btn-circle {
  // width: 40px;
  // height: 40px;
  // border-radius: 30px;
  display: flex;
  cursor: pointer;
  justify-content: center;
  align-items: center;
}

.btn-queue {
  position: absolute;
  top: 0;
  right: 0;
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
  animation: tronFilter 5s ease-in-out infinite alternate;

  .spinning-bike {
    max-height: 3.5em;
  }
}
</style>
