import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Play',
    component: () => import('@/views/Play.vue'),
  },
  {
    path: '/bikedex',
    name: 'BikeDex',
    component: () => import('@/views/BikeDex.vue'),
  },
  {
    path: '/queue',
    name: 'Queue',
    component: () => import('@/views/QueueBikeTag.vue'),
  },
  // {
  //   path: '/test',
  //   name: 'CarouselTest',
  //   component: () => import('@/views/ImagePreviewTest.vue'),
  // },
  {
    path: '/how',
    name: 'How',
    component: () => import('@/views/HowTo.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/components/HtmlContent.vue'),
  },
  {
    path: '/hint',
    name: 'Hint',
    component: () => import('@/views/Hint.vue'),
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('@/components/HtmlContent.vue'),
  },
  {
    path: '/players/',
    name: 'Players',
    component: () => import('@/views/PlayerList.vue'),
  },
  {
    path: '/leaderboard',
    name: 'LeaderBoard',
    component: () => import('@/views/Leaderboard.vue'),
  },
  {
    path: '/players/:name',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
