<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <main>
    <router-view />
  </main>
  <Nav />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Game from "./views/Game.vue";
import Nav from "./components/Nav.vue";
import 'primevue/resources/primevue.min.css'
import "primevue/resources/themes/bootstrap4-dark-purple/theme.css"
import 'primeicons/primeicons.css'

export default defineComponent({
  name: "App",
  components: {
    Game,
    Nav,
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
