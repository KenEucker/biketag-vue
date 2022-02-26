<template>
  <header v-if="variant === 'top'" class="biketag-header">
    <!-- The header logo and profile and hamburger buttons go here -->
    <nav class="biketag-header-nav navbar navbar-expand-lg">
      <div v-if="isShow" class="nav-item" @click="goBack">
        <img
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzknIGhlaWdodD0nMjUnIHZpZXdCb3g9JzAgMCAzOSAyNScgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTQuNDUzMzcgOS42NDMzMUgzMi40NTM0JyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMi42NDM0QzEzLjI1MyAxMS4xMDA2IDQ2LjAyOTMgMTAuNjQzNCAzNS4xMiAxMC42NDM0QzMwLjc0MDcgMTAuNjQzNCA3LjE4NjUgOC4xNzcxIDUuNDUzMzcgMTEuNjQzNCcgc3Ryb2tlPSdibGFjaycgc3Ryb2tlLXdpZHRoPScyJyBzdHJva2UtbGluZWNhcD0ncm91bmQnLz4KPHBhdGggZD0nTTEzLjQ1MzQgMS42NDMyNUMxMi4wNTEyIDMuODg2NzMgMTAuNTA5MiA2LjA3MTUzIDguODk3ODMgOC4xNDMyNUM3Ljc4NTY5IDkuNTczMTQgNS40MDQ2MyA5LjI3NDg3IDQuNjc1NjEgMTAuODY1NUMzLjEyMDkyIDE0LjI1NzUgLTAuMzI1NTA2IDEyLjI4ODEgMy41MDg5NCAxNS42NDMyQzUuNTU4OSAxNy40MzcgNy43MzYyMSAxOC45MjYxIDkuNjc1NiAyMC44NjU1QzEzLjEwMjcgMjQuMjkyNiAxMS4xOTg3IDIzLjU3NzEgOC42NzU2IDIwLjY0MzJDNi4zMDQwMyAxNy44ODU2IDIuOTUwNjQgMTQuOTY1NSAxLjE3NTYxIDExLjgwOTlDMC4wNDYyMTQzIDkuODAyMTEgNC42ODczOCA3LjQ1MDIxIDUuODk3ODMgNi42NDMyNUM3LjMxOTIyIDUuNjk1NjUgMTUuMDExNSAtMS4wODYzOSAxMi4wMDg5IDEuNjQzMjVDOS4zMDkzOCA0LjA5NzM5IDQuNjI2OTUgNy4yNDg3OCAzLjIzMTE2IDEwLjQyMUMyLjQwMjM0IDEyLjMwNDcgLTAuMDMxMzczNSAxMi4zNjE5IDIuMDA4OTQgMTQuNTg3N0MzLjIxODc2IDE1LjkwNzUgNC43NjMyMSAxNi4yNzA2IDUuOTUzMzggMTcuNjk4OEM3LjgxNjg4IDE5LjkzNSAxMC40MDY2IDIyLjY0MzIgMTMuNDUzNCAyMi42NDMyJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMS42NDMzQzUuNzUzNDIgMTQuMjIxNSAxMS42NDY4IDE5LjAzMDEgMTMuNDUzNCAyMi42NDMzJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8L3N2Zz4K"
          alt="go back"
        />
      </div>
      <img
        v-if="!isShow && !authLoading && $auth.isAuthenticated"
        src="/images/Profile.svg"
        alt="Profile con"
        @click="goProfile"
      />
      <div class="navbar-brand nav-item">
        <a href="./">
          <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
        </a>
        <div>
          <span class="game-title">{{ getGameTitle }}</span>
        </div>
      </div>

      <button
        class="navbar-toggler"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <img src="/images/Hamburger.svg" alt="Burge menu" />
      </button>

      <div id="navbarSupportedContent" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item" @click="goAboutPage">
            {{ $t('menu.about') }}
          </li>
          <li class="nav-item" @click="goUsersPage">
            {{ $t('menu.players') }}
          </li>
          <li class="nav-item" @click="goLeaderboardPage">
            {{ $t('menu.top10') }}
          </li>
          <li class="nav-item" @click="goBikeTagsPage">
            {{ $t('menu.biketags') }}
          </li>
          <li class="nav-item" @click="goQueuePlay">
            {{ $t('menu.play') }}
          </li>
          <li class="nav-item" @click="goHowPage">
            {{ $t('menu.howto') }}
          </li>
          <li class="nav-item">
            <template v-if="!authLoading">
              <template v-if="$auth.isAuthenticated">
                <li class="nav-item" @click="goProfile">
                  {{ $t('menu.profile') }}
                </li>
                <li class="nav-item" @click="logout">
                  {{ $t('menu.logout') }}
                </li>
              </template>
              <li v-else class="nav-item" @click="login">
                {{ $t('menu.login') }}
              </li>
            </template>
          </li>
        </ul>
      </div>
    </nav>
  </header>
  <footer v-if="variant === 'bottom'" class="container mt-5 pb-5">
    <!-- The footer nav buttons and link to homepage go here -->
    <div class="row">
      <div class="col-md-2">
        <div class="worldwide">
          <bike-tag-button variant="circle" @click="goWorldwide">
            <img src="../assets/images/npworld.png" alt="BikeTag World Wide" />
          </bike-tag-button>
          <!-- <div>{{ $t('components.footer.biketag') }}</div> -->
          <!-- <i class="fa fa-globe" aria-hidden="true"></i> -->
          <!-- <div>{{ $t('components.footer.worldwide') }}</div> -->
        </div>
      </div>
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
  </footer>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import { GetQueryString } from '@/common/utils'

export default defineComponent({
  name: 'BikeTagMenu',
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
  computed: {
    ...mapGetters(['getGameTitle', 'getLogoUrl', 'getCurrentBikeTag']),
    isShow() {
      if (this.$route.name) {
        console.log(`page:: ${this.$route.name}`)
      }
      return this.$route.name === 'Play'
    },
  },
  async created() {
    console.log('created')
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
  mounted() {
    this.checkForNewBikeTagPost()
    setTimeout(async () => {
      this.$auth.getIdTokenClaims().then((value) => {
        this.$store.dispatch('setUser', { ...this.$auth.user, token: value.__raw })
      })
    }, 2000)
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
    logout() {
      this.$store.dispatch('setUser')
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
    goProfile: function () {
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
}
</style>
