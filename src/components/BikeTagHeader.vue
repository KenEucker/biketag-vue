<template>
  <div class="biketag-header">
    <div class="">
      <div class="nav-buttons mt-4 mb-4">
        <bike-tag-button class="button-left" :text="$t('menu.biketags')" @click="goBikeTagsPage" />
        <bike-tag-button
          class="button-middle z-1"
          variant="bold"
          :text="$t('menu.play')"
          @click="goQueuePlay"
        />
        <bike-tag-button class="button-right" :text="$t('menu.howto')" @click="goHowPage" />
        <span
          v-if="getEasterEgg && playingEaster"
          class="fas fa-volume-mute"
          @click="muteEasterEgg"
        ></span>
      </div>
    </div>
    <audio id="biketag-jingle" ref="jingle">
      <source id="audioSource" :autoplay="playingEaster" type="audio/mpeg" :src="getEasterEgg" />
      {{ $t('pages.howto.browser_not_support_audio') }}
    </audio>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default defineComponent({
  name: 'BikeTagHeader',
  components: {
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
    }
  },
  computed: {
    showAuth() {
      return false
    },
    // isShow() {
    //   return this.$route.name === 'Play' && !this.$route.params?.tagnumber?.length ? false : true
    // },
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
  },
  methods: {
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
      this.$store.dispatch('setProfile')
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
    goHowPage: function () {
      this.$router.push('/howtoplay')
    },
  },
})
</script>
<style lang="scss" scoped>
// .header-logo .logo {
//   width: auto;
//   height: 8rem;
//   line-height: 8rem;
//   margin: auto;
// }

// .header2 {
//   color: blue;
// }

// start modififed by will

// .nav-buttons {
//   //   height: 250px;
//   margin: 0 !important;
// }

// end modified by will

// .bike-btn {
//   background-size: unset !important;
// }

// start of modified by will
// .biketag-header-nav {
//   display: flex;
//   flex-direction: row;
//   justify-content: center;
//   gap: 2rem;
//   padding-top: 0.5rem;
// }

// end of modified by will

// .bt-bicycle {
//   background-size: cover;
//   background-position: center;
// }

// .z-1 {
//   z-index: 1;
//   position: relative;
// }

// .button {
//   &-left {
//     margin-right: -0.9375rem;
//   }
//   &-right {
//     margin-left: -0.9375rem;
//   }
// }

// .btn-circle {
//   // width: 40px;
//   // height: 40px;
//   // border-radius: 30px;
//   display: flex;
//   cursor: pointer;
//   justify-content: center;
//   align-items: center;
// }

// .btn-queue {
//   position: absolute;
//   top: 0;
//   right: 0;
//   z-index: 99;
//   font-size: 1.25em;
//   background-color: transparent !important;
//   border-color: transparent !important;

//   i {
//     color: forestgreen;
//     cursor: pointer;
//     font-size: 4.5vh;
//   }
// }

// .btn-queue {
//   animation: tronFilter 5s ease-in-out infinite alternate;

//   .spinning-bike {
//     max-height: 3.5em;
//   }
// }
</style>
