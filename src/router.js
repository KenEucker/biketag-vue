import Vue from 'vue';
import Router from 'vue-router';
import Feed from './views/Feed.vue';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'feed',
      component: Feed,
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
    },
    {
      path: '/user',
      name: 'user',
      component: () => import('./views/User.vue'),
    },
  ],
});
