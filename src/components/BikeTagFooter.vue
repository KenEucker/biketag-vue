<template>
  <div class="container mt-5">
    <div class="footer-buttons">
      <b-button class="m-1" variant="primary" @click="goAboutPage">
        {{ $t('menu.about') }}
      </b-button>
      <b-button class="m-1" variant="primary" @click="goUsersPage">
        {{ $t('menu.players') }}
      </b-button>
      <b-button class="m-1" variant="primary" @click="goLeaderboardPage">
        {{ $t('menu.top10') }}
      </b-button>
    </div>
    <div class="worldwide mt-4 mb-4">
      <a href="https://biketag.org">
        <i class="fa fa-globe" aria-hidden="true"></i>
        <i class="fa fa-globe ghost" aria-hidden="true"></i>
        <p>worldwide</p>
      </a>
    </div>
    <footer class="container mt-4 pb-5">
      <div class="row">
        <a href="https://github.com/KenEucker/biketag-vue"
          ><img src="../assets/images/github-logo.png" alt="GitHub" /><img
            src="../assets/images/github-mark.png"
            alt="GitHub Mark"
        /></a>
        <span><sup>0</sup>Sourced</span>
        <img class="flow" src="../assets/images/bidirectional-flow.svg" />
        <span>Deployed<sup>1</sup></span>
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

.worldwide {
  p {
    color: black;
  }

  a i {
    font-size: 5em;

    &:hover {
      filter: blur(2px);
    }
  }

  .ghost {
    color: black;
    z-index: -1;
    position: absolute;
    transform: translate(-103%, 2%);
  }
}

footer {
  display: flex;
  flex-flow: wrap;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 20vw;

  .row {
    span {
      font-family: monospace;
      padding-left: 1px;
      margin-left: 5px;
      color: white;
    }

    .flow {
      max-height: 131px;
      position: absolute;
      left: -50%;
      right: -50%;
      z-index: -1;
      padding-top: 1px;
    }
  }

  .row > * {
    margin: auto;
  }
}
</style>
