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
          <!-- <li
            v-if="isBikeTagAmbassador && getQueuedTags?.length"
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Approve' }"
            @click="goApprovePage"
          >
            {{ $t('menu.queue') }}
          </li> -->
          <li
            v-if="isBikeTagAmbassador"
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'Dashboard' }"
            @click="goDashboardPage"
          >
            {{ $t('menu.dashboard') }}
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
          <!-- Hiding the how-to page link to save space in the menu -->
          <!-- <li class="nav-item" :class="{ 'active-nav': currentRoute === 'How' }" @click="goHowPage">
            {{ $t('menu.howto') }}
          </li> -->
          <li
            class="nav-item"
            :class="{ 'active-nav': currentRoute === 'About' }"
            @click="goAboutPage"
          >
            {{ $t('menu.about') }}
          </li>
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
import { useAuth0 } from '@auth0/auth0-vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { debug, isAuthenticationEnabled, isOnline } from '../common'
import { useBikeTagStore } from '../store/index'

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
  }

  router.push({ name: 'Home' })
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
  // window.location = 'https://biketag.org/'
  router.push({ name: 'Landing' })
  // router.push('/worldwide')
}
function goApprovePage() {
  closeCollapsible()
  router.push('/approve')
}
function goDashboardPage() {
  closeCollapsible()
  router.push('/dashboard')
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
  router.push({ name: 'Home' })
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
