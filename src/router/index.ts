import About from '@/views/About.vue'
import Approve from '@/views/Approve.vue'
import BikeTags from '@/views/BikeTags.vue'
import Home from '@/views/Home.vue'
import HowToPlay from '@/views/HowToPlay.vue'
import Landing from '@/views/Landing.vue'
import Leaderboard from '@/views/Leaderboard.vue'
import Login from '@/views/Login.vue'
import Logout from '@/views/Logout.vue'
import Map from '@/views/Map.vue'
import Play from '@/views/Play.vue'
import Player from '@/views/Player.vue'
import Players from '@/views/Players.vue'
import Profile from '@/views/Profile.vue'
import Round from '@/views/Round.vue'
import Worldwide from '@/views/Worldwide.vue'
import { authGuard } from '@auth0/auth0-vue'
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { debug, isAuthenticationEnabled } from '../common/utils'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Landing',
    component: () => Landing,
  },
  {
    path: '/:tagnumber?',
    name: 'Home',
    component: () => Home,
  },
  {
    path: '/biketags/:currentPage?',
    name: 'BikeTags',
    component: () => BikeTags,
  },
  {
    path: '/players/:currentPage?',
    name: 'Players',
    component: () => Players,
  },
  {
    path: '/player/:name/:currentPage?',
    name: 'Player',
    component: () => Player,
  },
  {
    path: '/play',
    name: 'Play',
    component: () => Play,
  },
  {
    path: '/round',
    name: 'Round',
    component: () => Round,
  },
  {
    path: '/howtoplay',
    name: 'How',
    component: () => HowToPlay,
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => Leaderboard,
  },
  {
    path: '/about',
    name: 'About',
    component: () => About,
  },
  {
    path: '/login',
    name: 'Login',
    component: () => Login,
  },
  {
    path: '/logout',
    name: 'Logout',
    component: () => Logout,
  },
  {
    path: '/worldwide',
    name: 'Worldwide',
    component: () => Worldwide,
  },
  {
    path: '/map',
    name: 'Map',
    component: () => Map,
  },
]

let protectedRoutes: Array<RouteRecordRaw> = []

if (isAuthenticationEnabled()) {
  protectedRoutes = [
    {
      path: '/profile',
      name: 'Profile',
      beforeEnter: authGuard,
      component: () => Profile,
    },
    {
      path: '/approve',
      name: 'Approve',
      beforeEnter: authGuard,
      component: () => Approve,
    },
  ]
}

debug('init::router', { sitemap: routes.map((r) => r.path) })

const router = createRouter({
  history: createWebHistory(),
  routes: [...routes, ...protectedRoutes],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
