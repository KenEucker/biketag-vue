<template>
  <nav>
    <ul>
      <li v-for="route in routes" :key="route.path">
        <router-link :to="route.to" :class="{ active: isActive(route.to) }">{{
          route.text
        }}</router-link>
      </li>
    </ul>
  </nav>
</template>

<script>
import { computed } from "vue";
import { useRouter } from "vue-router";

export default {
  setup() {
    const routes = [
      { to: "/", text: "Game" },
      { to: "/explore", text: "Explore" },
      { to: "/upload", text: "Upload" },
      { to: "/profile", text: "Profile" },
    ];
    const router = useRouter();
    const activeRoute = computed(() => router.currentRoute.value.path);
    const isActive = (path) => path === activeRoute.value;
    return { isActive, routes };
  },
};
</script>

<style>
nav {
  background-color: navy;
  height: 10vh;
  width: 100vw;
  border-top: 5px solid navy;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  left: 0;
  bottom: 0;
}

nav li {
  color: #fff;
  margin: 0 30px;
}
</style>