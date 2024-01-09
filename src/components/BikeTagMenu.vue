<template>
  <header
    v-if="props.variant === 'top'"
    :class="`biketag-header ${!showHeader ? 'is-hidden' : ''}`"
  >
    <!-- The header logo and profile and hamburger buttons go here -->
    <nav id="navmenu" class="navbar">
      <div class="navbar--top">
        <!-- Back Arrow -->
        <div v-if="isShow" class="back-arrow" @click="goBack">
          <img
            src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzknIGhlaWdodD0nMjUnIHZpZXdCb3g9JzAgMCAzOSAyNScgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTQuNDUzMzcgOS42NDMzMUgzMi40NTM0JyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMi42NDM0QzEzLjI1MyAxMS4xMDA2IDQ2LjAyOTMgMTAuNjQzNCAzNS4xMiAxMC42NDM0QzMwLjc0MDcgMTAuNjQzNCA3LjE4NjUgOC4xNzcxIDUuNDUzMzcgMTEuNjQzNCcgc3Ryb2tlPSdibGFjaycgc3Ryb2tlLXdpZHRoPScyJyBzdHJva2UtbGluZWNhcD0ncm91bmQnLz4KPHBhdGggZD0nTTEzLjQ1MzQgMS42NDMyNUMxMi4wNTEyIDMuODg2NzMgMTAuNTA5MiA2LjA3MTUzIDguODk3ODMgOC4xNDMyNUM3Ljc4NTY5IDkuNTczMTQgNS40MDQ2MyA5LjI3NDg3IDQuNjc1NjEgMTAuODY1NUMzLjEyMDkyIDE0LjI1NzUgLTAuMzI1NTA2IDEyLjI4ODEgMy41MDg5NCAxNS42NDMyQzUuNTU4OSAxNy40MzcgNy43MzYyMSAxOC45MjYxIDkuNjc1NiAyMC44NjU1QzEzLjEwMjcgMjQuMjkyNiAxMS4xOTg3IDIzLjU3NzEgOC42NzU2IDIwLjY0MzJDNi4zMDQwMyAxNy44ODU2IDIuOTUwNjQgMTQuOTY1NSAxLjE3NTYxIDExLjgwOTlDMC4wNDYyMTQzIDkuODAyMTEgNC42ODczOCA3LjQ1MDIxIDUuODk3ODMgNi42NDMyNUM3LjMxOTIyIDUuNjk1NjUgMTUuMDExNSAtMS4wODYzOSAxMi4wMDg5IDEuNjQzMjVDOS4zMDkzOCA0LjA5NzM5IDQuNjI2OTUgNy4yNDg3OCAzLjIzMTE2IDEwLjQyMUMyLjQwMjM0IDEyLjMwNDcgLTAuMDMxMzczNSAxMi4zNjE5IDIuMDA4OTQgMTQuNTg3N0MzLjIxODc2IDE1LjkwNzUgNC43NjMyMSAxNi4yNzA2IDUuOTUzMzggMTcuNjk4OEM3LjgxNjg4IDE5LjkzNSAxMC40MDY2IDIyLjY0MzIgMTMuNDUzNCAyMi42NDMyJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8cGF0aCBkPSdNMi40NTMzNyAxMS42NDMzQzUuNzUzNDIgMTQuMjIxNSAxMS42NDY4IDE5LjAzMDEgMTMuNDUzNCAyMi42NDMzJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8L3N2Zz4K"
            alt="go back"
          />
        </div>
        <!-- Region Image -->
        <div class="navbar-brand">
          <a href="/" @click.prevent.stop="resetBikeTagApp">
            <img :src="getLogoUrl('m')" class="logo" alt="BikeTag Logo" />
          </a>
          <div>
            <span class="game-title">{{ getGameTitle }}</span>
          </div>
        </div>

        <!-- QueuedTags -->
        <div v-if="getQueuedTags?.length" class="max-h-3" @click="goRoundPage">
          <bike-tag-queue :limit="limitQueue" />
        </div>

        <!-- Hamburger Menu -->
        <button ref="buttonCollapse" v-b-toggle.navbarSupportedContent class="navbar-toggler">
          <img class="hamburger-image" src="/images/Hamburger.svg" alt="menu" />
        </button>
      </div>

      <b-collapse id="navbarSupportedContent" ref="navList" class="navbar-collapse">
        <ul class="m-auto navbar-nav mb-lg-0">
          <li v-if="isAuthenticated" class="nav-item">
            <img
              class="profile-icon"
              :src="getProfileImageSrc"
              alt="Profile Icon"
              @click="goProfile"
            />
          </li>
          <li
            v-if="isBikeTagAmbassador && getQueuedTags?.length"
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Approve' }"
            @click="goApprovePage"
          >
            {{ $t('menu.queue') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Home' }"
            @click="goHomePage"
          >
            {{ $t('menu.home') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Play' }"
            @click="goPlayPage"
          >
            {{ $t('menu.play') }}
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
            :class="{ 'active-nav': currentRoute === 'Players' }"
            @click="goPlayersPage"
          >
            {{ $t('menu.players') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Leaderboard' }"
            @click="goLeaderboardPage"
          >
            {{ $t('menu.top10') }}
          </li>
          <li class="nav-item" :class="{ 'active-nav': currentRoute === 'How' }" @click="goHowPage">
            {{ $t('menu.howto') }}
          </li>
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'About' }"
            @click="goAboutPage"
          >
            {{ $t('menu.about') }}
          </li>
          <template v-if="isAuthenticated">
            <li class="nav-item" @click="logoutClick">
              {{ $t('menu.logout') }}
            </li>
          </template>
          <template v-else>
            <li
              v-if="showLogin"
              class="nav-item"
              :class="{ 'active-nav': currentRoute === 'Login' }"
              @click="login"
            >
              {{ $t('menu.login') }}
            </li>
          </template>
        </ul>
      </b-collapse>
    </nav>
  </header>
  <footer v-if="props.variant === 'bottom'" class="container pb-5 mt-5 footer">
    <!-- Fixed Footer -->
    <div class="footer-fixed__wrapper">
      <!-- Leaderboard -->
      <bike-tag-button
        class="footer-fixed__group_column"
        :text="$t('menu.top10')"
        @click="goLeaderboardPage"
      >
      </bike-tag-button>

      <!-- World -->
      <div class="button-reset-container">
        <bike-tag-button class="button-reset" variant="circle" @click="goWorldwide">
          <img class="footer-image" src="@/assets/images/npworld.webp" alt="BikeTag World Wide" />
        </bike-tag-button>
      </div>
      <!-- Players -->
      <bike-tag-button
        class="footer-fixed__group_column"
        :text="$t('menu.players')"
        @click="goPlayersPage"
      >
      </bike-tag-button>
    </div>
  </footer>
</template>

<script setup name="BikeTagMenu">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { useRouter, useRoute } from 'vue-router'
import { debug, isOnline, isAuthenticationEnabled } from '../common/utils'
import { useBikeTagStore } from '../store/index'
import { useI18n } from 'vue-i18n'

// components
import BikeTagButton from './BikeTagButton.vue'
import BikeTagQueue from './BikeTagQueue.vue'

// props
const props = defineProps({
  logo: {
    type: String,
    default: null,
  },
  variant: {
    type: String,
    default: 'top',
  },
})

// data
/// Now showing the login menu option, always
const showLogin = ref(isAuthenticationEnabled())
const showHeader = ref(true)
const lastScrollPosition = ref(0)
const scrollOffset = ref(40)
const buttonCollapse = ref(null)
const navList = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const auth0 = isAuthenticationEnabled() ? useAuth0() : undefined

// computed
const isAuthenticated = computed(() => (auth0 ? auth0.isAuthenticated.value : false))
const getGameTitle = computed(() => store.getGameTitle)
const getLogoUrl = computed(() => store.getLogoUrl)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const getQueuedTags = computed(() => store.getQueuedTags)
const limitQueue = computed(() => (window.innerWidth < 500 ? 2 : 0))
const isShow = computed(() => {
  if (route.name) {
    debug('view::loaded', route.name)
  }
  return route.name !== 'Home'
})
const currentRoute = computed(() => {
  return route.name
})
const getProfileImageSrc = computed(() => {
  return isBikeTagAmbassador.value ? '/images/biketag-ambassador.svg' : '/images/biketag-player.svg'
})

// methods
// Toggle if navigation is shown or hidden
function onScroll() {
  if (window.pageYOffset < 0) {
    return
  }
  if (Math.abs(window.pageYOffset - lastScrollPosition.value) < scrollOffset.value) {
    return
  }
  showHeader.value = window.pageYOffset < lastScrollPosition.value
  lastScrollPosition.value = window.pageYOffset
}
async function resetBikeTagApp() {
  if (await isOnline()) {
    store.resetBikeTagCache()
    router.push({ path: '/' })
  } else {
    router.push('/')
  }
}
function login() {
  closeCollapsible()
  router.push('/login')
}
async function logoutClick() {
  if (auth0) {
    await store.setProfile()
    const returnTo = `${window.location.origin}/logout`
    await auth0.logout({
      returnTo,
    })
  }
}
function closeCollapsible() {
  // console.log(buttonCollapse.value)
  buttonCollapse.value.click()
  // navList.value.classList.remove('show')
}
function goWorldwide() {
  window.location = 'http://biketag.org/'
  // router.push('/worldwide')
}
function goApprovePage() {
  closeCollapsible()
  router.push('/approve')
}
function goBikeTagsPage() {
  closeCollapsible()
  router.push('/biketags')
}
function goPlayPage() {
  closeCollapsible()
  router.push('/play')
}
function goProfile() {
  closeCollapsible()
  router.push('/profile')
}
function goAboutPage() {
  closeCollapsible()
  router.push('/about')
}
function goLeaderboardPage() {
  closeCollapsible()
  router.push('/leaderboard')
}
function goPlayersPage() {
  closeCollapsible()
  router.push('/players')
}
function goHowPage() {
  closeCollapsible()
  router.push('/howtoplay')
}
function goHomePage() {
  closeCollapsible()
  router.push('/')
}
function goRoundPage() {
  router.push('/round')
}
function goBack() {
  router.back()
}

// mounted
onMounted(() => {
  lastScrollPosition.value = window.pageYOffset
  window.addEventListener('scroll', onScroll)
})

// beforeUnmount
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.is-hidden {
  transform: translateY(-100%);
}

header {
  background-color: #e5e5e5;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 999;
  box-shadow:
    0 3px 6px rgb(0 0 0 / 16%),
    0 3px 6px rgb(0 0 0 / 23%);
  transition: transform 0.5s ease-out;

  nav {
    .show {
      height: calc(100vh - 82px);

      ul {
        height: inherit;
        overflow: auto;
      }

      @media (min-width: $breakpoint-desktop) {
        height: auto;
      }
    }

    .profile-icon {
      max-width: 25vw;
      height: auto;
    }

    @media (width >= 990px) {
      .profile-icon {
        max-width: 10vh;
      }
    }

    .navbar-brand {
      margin: 0;
      margin-left: 1rem;

      // font-size: 1rem;

      @media (min-width: $breakpoint-desktop) {
        margin: 0 2rem;
      }
    }

    .navbar-collapse {
      flex-grow: unset;

      @media (min-width: $breakpoint-desktop) {
        overflow: auto;
      }

      ul > li {
        @media (width >= 992px) {
          margin: 1rem;
        }
      }
    }

    .navbar-toggler {
      //   margin-right: 1rem;
      margin: 0.5rem 1rem;
    }

    .logo {
      max-width: 10rem;
      height: 3.5rem;
    }

    .hamburger-image {
      width: auto;
      height: 2.5rem;
    }

    .game-title {
      color: black;
      font-family: $default-secondary-font-family;

      @media (width <= 990px) {
        display: none;
      }
    }

    .nav-item {
      font-family: $default-secondary-font-family;
      text-transform: uppercase;
      font-size: 2.5rem;
      cursor: pointer;

      @media (width <= 990px) {
        box-shadow:
          0 1px 3px rgb(0 0 0 / 12%),
          0 1px 2px rgb(0 0 0 / 24%);
        border-bottom: 1px solid black;
        padding: 1rem 0;
        font-size: 1.5rem;
      }
    }

    .back-arrow {
      margin-left: 1rem;
      margin-right: 1.5rem;
      cursor: pointer;
    }
  }
}

.navbar {
  padding-bottom: 0 !important;
  padding-top: 0 !important;

  .navbar--top {
    align-items: center;
    display: flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    width: 100%;
  }
}

.navbar-nav {
  align-items: center;

  @media (width <= 990px) {
    align-items: unset;
    height: 100vh;
  }
}

.button-reset-container {
  display: flex;

  .button-reset {
    min-height: auto;

    // margin: auto;
  }

  .footer-image {
    height: 40px;
  }
}

.active-nav {
  //   background-color: black;
  //   color: white;

  border-bottom: 3px solid black;

  @media (width <= 990px) {
    border-bottom: none;
    background-color: black;
    color: white;
  }
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
      box-shadow:
        0 3px 6px rgb(0 0 0 / 16%),
        0 3px 6px rgb(0 0 0 / 23%);
      z-index: 100;
      width: 100%;
      background-color: #e5e5e5;
      position: fixed;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: space-between;
      font-family: $default-secondary-font-family;
      color: black;
      font-size: 0.75rem;
      padding: 0.25rem 0;
      height: 76px;
    }

    &__group_column {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 0 1rem;
      min-height: auto !important;
    }

    &__image {
      width: 3.125rem;
      height: auto;
    }
  }
}
</style>
