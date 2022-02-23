<template>
  <div class="biketag-header">
    <div class="container mt-2">
      <div v-if="isShow" class="menu-btn p-2">
        <bike-tag-button class="btn-circle" variant="circle" @click="goBack">
          <!-- <i class="fa back-button fa-long-arrow-alt-left" /> -->
          <!--Removed glowing bike icon from here-->
        </bike-tag-button>
      </div>
      <div class="header-logo">
        <a href="./">
          <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
        </a>
        <div>
          <span class="game-title">{{ getGameTitle }}</span>
        </div>
      </div>
      <div class="nav-buttons align-center mt-4 mb-4">
        <bike-tag-button :text="$t('menu.biketags')" @click="goBikeTagsPage" />
        <bike-tag-button variant="bold" :text="$t('menu.play')" @click="goQueuePlay" />
        <bike-tag-button :text="$t('menu.howto')" @click="goHowPage" />
        <span
          v-if="getEasterEgg && playingEaster"
          class="fas fa-volume-mute"
          @click="muteEasterEgg"
        ></span>
        <div v-if="showAuth && !authLoading">
          <bike-tag-button
            v-if="!$auth.isAuthenticated"
            :text="$t('menu.login')"
            @click="login"
          />
          <bike-tag-button
            v-if="$auth.isAuthenticated"
            :text="$t('menu.logout')"
            @click="logout"
          />
        </div>
        <netlify-identity-widget />
      </div>
      <audio id="biketag-jingle" ref="jingle">
        <source id="audioSource" :autoplay="playingEaster" type="audio/mpeg" :src="getEasterEgg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import { GetQueryString } from '@/common/utils'
import NetlifyIdentityWidget from '@/components/NetlifyIdentityWidget.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import netlifyIdentity from 'netlify-identity-widget'

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
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
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
      if (this.$auth.isAuthenticated){
        this.$auth.logout()
      } else {
        if (this.isBikeTagAmbassador) {
          netlifyIdentity.open('login')
        } else {
          this.$auth.loginWithRedirect()
        }
      }
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

.nav-buttons {
  height: 250px;
  margin: 0!important;
}

.bike-btn {
  background-size: unset!important;
}

.bt-bicycle {
  background-size: cover;
  background-position: center;
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

.menu-btn {
  position: absolute;
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
