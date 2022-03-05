<template>
  <header v-if="variant === 'top'" class="biketag-header">
    <!-- The header logo and profile and hamburger buttons go here -->
    <nav class="biketag-header-nav navbar navbar-expand-lg">
      <!-- Back Arrow -->
      <div v-if="isShow" class="back-arrow" @click="goBack">
        <img
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzknIGhlaWdodD0nMjUnIHZpZXdCb3g9JzAgMCAzOSAyNScgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTQuNDUzMzcgOS42NDMzMUgzMi40NTM0JyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMi42NDM0QzEzLjI1MyAxMS4xMDA2IDQ2LjAyOTMgMTAuNjQzNCAzNS4xMiAxMC42NDM0QzMwLjc0MDcgMTAuNjQzNCA3LjE4NjUgOC4xNzcxIDUuNDUzMzcgMTEuNjQzNCcgc3Ryb2tlPSdibGFjaycgc3Ryb2tlLXdpZHRoPScyJyBzdHJva2UtbGluZWNhcD0ncm91bmQnLz4KPHBhdGggZD0nTTEzLjQ1MzQgMS42NDMyNUMxMi4wNTEyIDMuODg2NzMgMTAuNTA5MiA2LjA3MTUzIDguODk3ODMgOC4xNDMyNUM3Ljc4NTY5IDkuNTczMTQgNS40MDQ2MyA5LjI3NDg3IDQuNjc1NjEgMTAuODY1NUMzLjEyMDkyIDE0LjI1NzUgLTAuMzI1NTA2IDEyLjI4ODEgMy41MDg5NCAxNS42NDMyQzUuNTU4OSAxNy40MzcgNy43MzYyMSAxOC45MjYxIDkuNjc1NiAyMC44NjU1QzEzLjEwMjcgMjQuMjkyNiAxMS4xOTg3IDIzLjU3NzEgOC42NzU2IDIwLjY0MzJDNi4zMDQwMyAxNy44ODU2IDIuOTUwNjQgMTQuOTY1NSAxLjE3NTYxIDExLjgwOTlDMC4wNDYyMTQzIDkuODAyMTEgNC42ODczOCA3LjQ1MDIxIDUuODk3ODMgNi42NDMyNUM3LjMxOTIyIDUuNjk1NjUgMTUuMDExNSAtMS4wODYzOSAxMi4wMDg5IDEuNjQzMjVDOS4zMDkzOCA0LjA5NzM5IDQuNjI2OTUgNy4yNDg3OCAzLjIzMTE2IDEwLjQyMUMyLjQwMjM0IDEyLjMwNDcgLTAuMDMxMzczNSAxMi4zNjE5IDIuMDA4OTQgMTQuNTg3N0MzLjIxODc2IDE1LjkwNzUgNC43NjMyMSAxNi4yNzA2IDUuOTUzMzggMTcuNjk4OEM3LjgxNjg4IDE5LjkzNSAxMC40MDY2IDIyLjY0MzIgMTMuNDUzNCAyMi42NDMyJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMS42NDMzQzUuNzUzNDIgMTQuMjIxNSAxMS42NDY4IDE5LjAzMDEgMTMuNDUzNCAyMi42NDMzJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8L3N2Zz4K"
          alt="go back"
        />
      </div>
      <!-- Region Image -->
      <div class="navbar-brand">
        <a href="./">
          <img :src="getLogoUrl('h=256&w=256')" class="logo" />
        </a>
        <div>
          <span class="game-title">{{ getGameTitle }}</span>
        </div>
      </div>

      <!-- Hamburger Menu -->
      <button
        ref="buttonCollapse"
        class="navbar-toggler"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <img class="hamburger-image" src="/images/Hamburger.svg" alt="Burge menu" />
      </button>

      <div id="navbarSupportedContent" ref="navList" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-lg-0">
          <li class="nav-item">
            <img
              v-if="!authLoading && $auth.isAuthenticated"
              class="profile-icon"
              :src="getProfileImageSrc"
              alt="Profile Icon"
              @click="goProfile"
            />
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'About' }"
            @click="goAboutPage"
          >
            {{ $t('menu.about') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'BikeTags' }"
            @click="goBikeTagsPage"
          >
            {{ $t('menu.biketags') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Queue' }"
            @click="goQueuePlay"
          >
            {{ $t('menu.play') }}
          </li>
          <li class="nav-item" :class="{ 'active-nav': currentRoute === 'How' }" @click="goHowPage">
            {{ $t('menu.howto') }}
          </li>
          <template v-if="!authLoading">
            <template v-if="$auth.isAuthenticated">
              <li class="nav-item" @click="logout">
                {{ $t('menu.logout') }}
              </li>
            </template>
            <li
              v-else
              class="nav-item"
              :class="{ 'active-nav': currentRoute === 'Login' }"
              @click="login"
            >
              {{ $t('menu.login') }}
            </li>
          </template>
        </ul>
      </div>
    </nav>
  </header>
  <footer v-if="variant === 'bottom'" class="container mt-5 pb-5 footer">
    <!-- The footer nav buttons and link to homepage go here -->
    <div class="row">
      <div class="col-md-2">
        <a href="https://github.com/KenEucker/biketag-vue">
          <img src="../assets/images/github-logo.png" alt="GitHub" />
          <img src="../assets/images/github-mark.png" alt="GitHub Mark" />
        </a>
        <span><sup>0</sup>{{ $t('components.footer.sourced') }}</span>
        <img class="flow" src="../assets/images/bidirectional-flow.svg" />
        <span>{{ $t('components.footer.deployed') }}<sup>1</sup></span>
        <a href="https://www.netlify.com/">
          <img src="../assets/images/netlify-logo-dark.svg" alt="Netlify" />
        </a>
      </div>
    </div>

    <!-- Fixed Footer -->
    <div class="footer-fixed__wrapper">
      <!-- Leaderboard -->
      <div class="footer-fixed__group_column" @click="goLeaderboardPage">
        <div>{{ $t('menu.top10') }}</div>
        <img :src="require('@/assets/images/underline.svg')" alt="Underline" />
      </div>

      <!-- World -->
      <div>
        <bike-tag-button class="button-reset" variant="circle" @click="goWorldwide">
          <img
            class="footer-fixed_image"
            src="../assets/images/npworld.png"
            alt="BikeTag World Wide"
          />
        </bike-tag-button>
      </div>
      <!-- Players -->
      <div class="footer-fixed__group_column" @click="goUsersPage">
        <div>{{ $t('menu.players') }}</div>
        <img :src="require('@/assets/images/underline-reverse.svg')" alt="Underline Reverse" />
      </div>
    </div>
  </footer>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton'

export default defineComponent({
  name: 'BikeTagMenu',
  components: {
    BikeTagButton,
  },
  props: {
    logo: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: 'top',
    },
  },
  data() {
    return {}
  },
  computed: {
    ...mapGetters([
      'getGameTitle',
      'getLogoUrl',
      'getCurrentBikeTag',
      'isDataInitialized',
      'isBikeTagAmbassador',
      'getProfile',
    ]),
    isShow() {
      if (this.$route.name) {
        console.log(`view::${this.$route.name}`)
      }
      return this.$route.name !== 'Play'
    },
    currentRoute() {
      return this.$route.name
    },
    getProfileImageSrc() {
      return this.isBikeTagAmbassador
        ? '/images/biketag-ambassador.svg'
        : '/images/biketag-player.svg'
    },
  },
  async created() {
    if (!this.isDataInitialized) {
      /// Set it first thing
      this.$store.dispatch('setDataInitialized')

      await this.$store.dispatch('setGame')
      await this.$store.dispatch('setTags')
      await this.$store.dispatch('setCurrentBikeTag')
      await this.$store.dispatch('setQueuedTags')
      await this.$store.dispatch('setPlayers')

      if (this.$auth.isAuthenticated && !this.getProfile?.nonce?.length) {
        const claims = await this.$auth.getIdTokenClaims()
        if (claims) {
          const token = claims.__raw
          this.$store.dispatch('setProfile', { ...this.$auth.user, token })
        } else {
          console.log('what is this?')
        }
      }

      this.checkForNewBikeTagPost()
    }
  },
  mounted() {
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
      this.closeCollapsible()
      this.$router.push('/login')
    },
    logout() {
      this.$store.dispatch('setProfile')
      this.$auth.logout({
        returnTo: window.location.origin,
      })
    },
    closeCollapsible() {
      this.$refs.buttonCollapse.setAttribute('aria-expanded', false)
      this.$refs.navList.classList.remove('show')
    },
    goWorldwide() {
      window.location = 'http://biketag.org/'
    },
    goBikeTagsPage: function () {
      this.closeCollapsible()
      this.$router.push('/biketags')
    },
    goQueuePlay: function () {
      this.closeCollapsible()
      this.$store.dispatch('setFormStepToJoin', true)
      this.$router.push('/play')
    },
    goProfile: function () {
      this.closeCollapsible()
      this.$router.push('/profile')
    },
    goAboutPage: function () {
      this.closeCollapsible()
      this.$router.push('/about')
    },
    goLeaderboardPage: function () {
      //   this.closeCollapsible()
      this.$router.push('/leaderboard')
    },
    goUsersPage: function () {
      //   this.closeCollapsible()
      this.$router.push('/players')
    },
    goHowPage: function () {
      this.closeCollapsible()
      this.$router.push('/howtoplay')
    },
    goBack: function () {
      this.$router.back()
    },
  },
})
</script>
<style lang="scss" scoped>
header {
  background-color: #e5e5e5;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 100;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
  nav {
    .profile-icon {
      max-width: 25vw;
      height: auto;
    }
    @media (min-width: 990px) {
      .profile-icon {
        max-width: 10vh;
      }
    }
    .navbar-brand {
      margin: 0 2rem;
    }
    .navbar-collapse {
      flex-grow: unset;

      @media (max-width: 990px) {
        height: 85vh;
        overflow: scroll;
      }
      ul > li {
        @media (min-width: 992px) {
          margin: 1rem;
        }
      }
    }
    .navbar-toggler {
      //   margin-right: 1rem;
      margin: 0.5rem;
    }
    .logo {
      height: 4.5rem;
      width: auto;
    }
    .hamburger-image {
      height: 3.5rem;
      width: auto;
    }
    .game-title {
      color: black;
      font-family: 'Prequel';

      @media (max-width: 990px) {
        display: none;
      }
    }
    .nav-item {
      font-family: 'Prequel';
      text-transform: uppercase;
      font-size: 2rem;
      cursor: pointer;

      @media (max-width: 990px) {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
        border-bottom: 1px solid black;
        padding: 2.5rem 0;
      }
    }
    .back-arrow {
      margin-left: 1rem;
    }
  }
}

.navbar {
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}

.button-reset {
  min-height: auto;
  padding: 0;
}

.active-nav {
  background-color: black;
  color: white;
}

footer {
  display: flex;
  flex-flow: wrap;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 20vw;

  .row {
    > div {
      font-family: monospace;
      padding-left: 1px;
      margin-left: 5px;
      color: white;
      position: relative;
    }

    span {
      font-family: monospace;
      padding-left: 1px;
      margin-left: 5px;
      color: white;
    }

    .worldwide {
      div {
        color: black;
        margin: 0;
      }

      a {
        text-decoration: none;

        i {
          font-size: 5em;

          &:hover {
            filter: blur(2px);
          }
        }
      }
    }

    .flow {
      max-height: 131px;
      position: absolute;
      top: 0%;
      right: 15%;
      z-index: -1;
      padding-top: 1px;
    }
  }

  .row > * {
    margin: auto;
  }
  .footer-fixed {
    &__wrapper {
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
      z-index: 100;
      width: 100%;
      background-color: #e5e5e5;
      position: fixed;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: space-between;
      font-family: 'Prequel';
      color: black;
      font-size: 0.75rem;
      padding: 0.25rem 0;
    }

    &__group_column {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 0 1rem;
    }

    &__image {
      width: 3.125rem;
      height: auto;
    }
  }
}
</style>
