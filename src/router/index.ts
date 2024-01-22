import { authGuard } from '@auth0/auth0-vue'
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { debug, isAuthenticationEnabled } from '../common/utils'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('@/views/Landing.vue'),
  },
  {
    path: '/:tagnumber?',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/biketags/:currentPage?',
    name: 'BikeTags',
    component: () => import('@/views/BikeTags.vue'),
  },
  {
    path: '/players/:currentPage?',
    name: 'Players',
    component: () => import('@/views/Players.vue'),
  },
  {
    path: '/player/:name/:currentPage?',
    name: 'Player',
    component: () => import('@/views/Player.vue'),
  },
  {
    path: '/play',
    name: 'Play',
    component: () => import('@/views/Play.vue'),
  },
  {
    path: '/round',
    name: 'Round',
    component: () => import('@/views/Round.vue'),
  },
  {
    path: '/howtoplay',
    name: 'How',
    component: () => import('@/views/HowToPlay.vue'),
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/logout',
    name: 'Logout',
    component: () => import('@/views/Logout.vue'),
  },
  {
    path: '/worldwide',
    name: 'Worldwide',
    component: () => import('@/views/Worldwide.vue'),
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/views/Map.vue'),
  },
]

let protectedRoutes: Array<RouteRecordRaw> = []

if (isAuthenticationEnabled()) {
  protectedRoutes = [
    {
      path: '/profile',
      name: 'Profile',
      beforeEnter: authGuard,
      component: () => import('@/views/Profile.vue'),
    },
    {
      path: '/approve',
      name: 'Approve',
      beforeEnter: authGuard,
      component: () => import('@/views/Approve.vue'),
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
