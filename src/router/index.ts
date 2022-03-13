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
    path: '/queue',
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
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/views/Map.vue'),
  },
]

let protectedRoutes: Array<RouteRecordRaw> = []

if (process.env.A_DOMAIN?.length) {
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

console.log('init::router', { sitemap: routes.map((r) => r.path) })

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...routes, ...protectedRoutes],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
