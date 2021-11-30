<template>
  <div class="container mt-4">
    <div>
      <b-button class="m-1" variant="primary" @click="goAboutPage">ABOUT</b-button>
      <b-button class="m-1" variant="primary" @click="goHintPage">HINT</b-button>
      <b-button class="m-1" variant="primary" @click="goDonatePage">DONATE</b-button>
    </div>
    <div>
      <b-button class="m-1" @click="goLeaderboardPage">Leaderboard</b-button>
      <b-button class="m-1" @click="goUsersPage">Users</b-button>
    </div>
    <div class="back-to-home">
      <a href="https://biketag.org">
        <i class="fa fa-globe" aria-hidden="true"></i>
        <h5>worldwide</h5>
      </a>
    </div>
    <footer class="footer container my-5">
      <!--Section: Content-->
      <section>
        <p class="copyright">
          BikeTag is an open source website
          <a href="https://github.com/KenEucker/biketag-website">developed on github</a>
        </p>
      </section>
      <!--Section: Content-->
    </footer>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HomePage',
  methods: {
    goAboutPage: function () {
      this.$store.dispatch('setHtml')
      this.$router.push('/about')
    },
    goHintPage: function () {
      this.$router.push('/hint')
    },
    goDonatePage: function () {
      this.$router.push('/donate')
    },
    goLeaderboardPage: function () {
      this.$router.push('/leaderboard')
    },
    goUsersPage: function () {
      this.$router.push('/players')
    },
  },
})
</script>
<style scoped>
.back-to-home a i {
  font-size: 5em;
}
</style>
