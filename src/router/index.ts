import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'
import { authGuard } from '@/auth/authGuard'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/landing',
    name: 'Landing',
    component: () => import('@/views/Landing.vue'),
  },
  {
    path: '/:tagnumber?',
    name: 'Play',
    component: () => import('@/views/Play.vue'),
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
    name: 'Queue',
    component: () => import('@/views/Queue.vue'),
  },
  {
    path: '/howtoplay',
    name: 'How',
    component: () => import('@/views/HowToPlay.vue'),
  },
  {
    path: '/leaderboard',
    name: 'LeaderBoard',
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
    path: '/worldwide',
    name: 'Worldwide',
    component: () => import('@/views/Worldwide.vue'),
  },
]

let protectedRoutes: Array<RouteRecordRaw> = []

if (process.env.AUTH0_DOMAIN?.length) {
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

console.log('init::router', { protectedRoutes })

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...routes, ...protectedRoutes],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
