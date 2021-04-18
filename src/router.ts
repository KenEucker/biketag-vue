import {createRouter, createWebHistory} from 'vue-router';

const history = createWebHistory()
const routes = [
    {
      path: '/',
      name: "game",
      component: () => import('./views/Game.vue'),
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('./views/Explore.vue'),
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('./views/Upload.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('./views/Profile.vue'),
    }
  ]

const router = createRouter({ history, routes });

export default router;