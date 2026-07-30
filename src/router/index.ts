import About from '@/views/About.vue'
import Approve from '@/views/Approve.vue'
import BikeTags from '@/views/BikeTags.vue'
import Dashboard from '@/views/Dashboard.vue'
import Delete from '@/views/Delete.vue'
import Edit from '@/views/Edit.vue'
import GameSettings from '@/views/GameSettings.vue'
import Home from '@/views/Home.vue'
import HowToPlay from '@/views/HowToPlay.vue'
import Landing from '@/views/Landing.vue'
import Launch from '@/views/Launch.vue'
import Leaderboard from '@/views/Leaderboard.vue'
import Login from '@/views/Login.vue'
import Logout from '@/views/Logout.vue'
import Map from '@/views/Map.vue'
import New from '@/views/New.vue'
import Play from '@/views/Play.vue'
import Player from '@/views/Player.vue'
import Players from '@/views/Players.vue'
import Profile from '@/views/Profile.vue'
import QueueFix from '@/views/QueueFix.vue'
import Rejections from '@/views/Rejections.vue'
import Round from '@/views/Round.vue'
import Worldwide from '@/views/Worldwide.vue'
import { authGuard } from '@auth0/auth0-vue'
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { debug, isAuthenticationEnabled } from '../common'

const protectedRoutes: Array<RouteRecordRaw> = isAuthenticationEnabled()
  ? [
      {
        path: '/profile',
        name: 'Profile',
        beforeEnter: authGuard,
        component: Profile,
      },
      {
        path: '/approve',
        name: 'Approve',
        beforeEnter: authGuard,
        component: Approve,
      },
      {
        path: '/rejections',
        name: 'Rejections',
        beforeEnter: authGuard,
        component: Rejections,
      },
      {
        path: '/dashboard',
        name: 'Dashboard',
        beforeEnter: authGuard,
        component: Dashboard,
      },
      {
        path: '/settings',
        name: 'GameSettings',
        beforeEnter: authGuard,
        component: GameSettings,
      },
      {
        path: '/queue-fix',
        name: 'Queue Fix',
        beforeEnter: authGuard,
        component: QueueFix,
      },
      {
        path: '/delete',
        name: 'Delete',
        beforeEnter: authGuard,
        component: Delete,
      },
      {
        path: '/edit',
        name: 'Edit',
        beforeEnter: authGuard,
        component: Edit,
      },
      {
        path: '/new',
        name: 'New',
        beforeEnter: authGuard,
        component: New,
      },
      {
        path: '/launch',
        name: 'Launch',
        beforeEnter: authGuard,
        component: Launch,
      },
    ]
  : []

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Landing',
    component: Landing,
  },
  ...protectedRoutes,
  {
    path: '/biketags',
    name: 'BikeTags',
    component: BikeTags,
  },
  {
    path: '/biketags/search',
    name: 'BikeTag Search',
    component: BikeTags,
  },
  {
    path: '/players',
    name: 'Players',
    component: Players,
  },
  {
    path: '/players/search',
    name: 'Player Search',
    component: Players,
  },
  {
    path: '/player/:name',
    name: 'Player',
    component: Player,
  },
  {
    path: '/player/:name/search',
    name: 'Player Tag Search',
    component: Player,
  },
  {
    path: '/play',
    name: 'Play',
    component: Play,
  },
  {
    path: '/round',
    name: 'Round',
    component: Round,
  },
  {
    path: '/howtoplay',
    name: 'How',
    component: HowToPlay,
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: Leaderboard,
  },
  {
    path: '/about',
    name: 'About',
    component: About,
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/logout',
    name: 'Logout',
    component: Logout,
  },
  {
    path: '/worldwide',
    name: 'Worldwide',
    component: Worldwide,
  },
  {
    path: '/map',
    name: 'Map',
    component: Map,
  },
  {
    path: '/:tagnumber?',
    name: 'Home',
    component: Home,
  },
]

debug('router::init', { sitemap: routes.map((r) => r.path) })

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
