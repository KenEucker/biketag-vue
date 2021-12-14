import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'
import Auth from '../auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:tagnumber?',
    name: 'Play',
    component: () => import('@/views/Play.vue'),
  },
  {
    path: '/bikedex/:currentPage?',
    name: 'BikeDex',
    component: () => import('@/views/BikeDex.vue'),
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
    path: '/queue',
    name: 'Queue',
    component: () => import('@/views/QueueBikeTag.vue'),
  },
  {
    path: '/how',
    name: 'How',
    component: () => import('@/views/HowTo.vue'),
  },
  {
    path: '/leaderboard',
    name: 'LeaderBoard',
    component: () => import('@/views/Leaderboard.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/components/HtmlContent.vue'),
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('@/components/HtmlContent.vue'),
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
]

let protectedRoutes: Array<RouteRecordRaw> = []
if (process.env.AUTH0_DOMAIN?.length) {
  protectedRoutes = [
  {
    path: '/profile',
    name: 'Profile',
    beforeEnter:  ? Auth.routeGuard : undefined,
    component: () => import('@/views/Profile.vue'),
  },
]
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...routes, ...protectedRoutes],
  scrollBehavior() {
    // always scroll to top
    return { top: 0 }
    //   return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //       resolve({ x: 0, y: 0 })
    //     }, 500)
    //   })
  },
})

export default router
