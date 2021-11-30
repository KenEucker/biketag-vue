import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('@/views/Archive.vue'),
  },
  {
    path: '/submittag',
    name: 'SubmitTag',
    component: () => import('@/views/SubmitTag.vue'),
  },
  {
    path: '/postreddit',
    name: 'PostReddit',
    component: () => import('@/views/PostReddit.vue'),
  },
  {
    path: '/how',
    name: 'How',
    component: () => import('@/components/HtmlContent.vue'),
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
    path: '/donate',
    name: 'Donate',
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
  {
    path: '/queueimg',
    name: 'QueueImg',
    component: () => import('@/views/QueueImg.vue'),
  },
  {
    path: '/queueimg2',
    name: 'QueueImg2',
    component: () => import('@/views/QueueImg2.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
