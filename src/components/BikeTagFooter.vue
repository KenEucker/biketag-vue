<template>
  <div class="container mt-5">
    <div class="footer-buttons">
      <b-button class="m-1" variant="primary" @click="goAboutPage">About</b-button>
      <b-button class="m-1" variant="primary" @click="goUsersPage">Players</b-button>
      <b-button class="m-1" variant="primary" @click="goLeaderboardPage">Top10</b-button>
    </div>
    <div class="worldwide mt-4 mb-4">
      <a href="https://biketag.org">
        <i class="fa fa-globe" aria-hidden="true"></i>
        <h5>worldwide</h5>
      </a>
    </div>
    <footer class="container mt-4 pb-5">
      <div class="row">
        <a href="https://github.com/KenEucker/biketag-vue"
          ><img src="../assets/images/github-logo.png" alt="GitHub" /><img
            src="../assets/images/github-mark.png"
            alt="GitHub Mark"
        /></a>
        <span>Sourced</span>
        <img class="flow" src="../assets/images/bidirectional-flow.svg" />
        <span>Deployed</span>
        <a href="https://www.netlify.com/"
          ><img src="../assets/images/netlify-logo-dark.svg" alt="Netlify"
        /></a>
      </div>
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
<style scoped lang="scss">
.footer-buttons {
  display: inline-flex;

  .btn {
    max-height: 3em;
  }
}

.worldwide a i {
  font-size: 5em;
}

footer {
  display: flex;
  flex-flow: wrap;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 55vw;

  .row {
    span {
      font-family: monospace;
    }
    .flow {
      max-height: 131px;
      position: absolute;
      left: -50%;
      right: -50%;
      z-index: -1;
      padding-top: 1px;
    }

    a {
    }
  }

  .row > * {
    margin: auto;
  }
}
</style>
