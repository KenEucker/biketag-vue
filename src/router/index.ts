import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Play',
    component: () => import('@/views/Play.vue'),
  },
  {
    path: '/bikedex/:currentPage?',
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
    path: '/players/:currentPage?',
    name: 'Players',
    component: () => import('@/views/Players.vue'),
  },
  {
    path: '/leaderboard',
    name: 'LeaderBoard',
    component: () => import('@/views/Leaderboard.vue'),
  },
  {
    path: '/player/:name/:currentPage?',
    name: 'Player',
    component: () => import('@/views/Player.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
