<template>
  <div class="container mt-4">
    <div>
      <b-button class="m-1" @click="goLeaderboardPage">Leaderboard</b-button>
      <b-button class="m-1" @click="goUsersPage">Playerboard</b-button>
    </div>
    <div class="back-to-home">
      <a href="https://biketag.org">
        <i class="fa fa-globe" aria-hidden="true"></i>
        <h5>worldwide</h5>
      </a>
    </div>
    <div>
      <b-button class="m-1" variant="primary" @click="goAboutPage">About</b-button>
      <b-button class="m-1" variant="primary" @click="goSupportPage">Support</b-button>
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
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BikeTagFooter',
  methods: {
    goAboutPage: function () {
      this.$router.push('/about')
    },
    goSupportPage: function () {
      this.$router.push('/support')
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
