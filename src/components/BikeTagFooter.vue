<template>
  <div class="button-group">
    <!-- Left Button -->
    <bike-tag-button class="button-group__left" :text="$t('menu.about')" @click="goAboutPage" />
    <!-- Middle Button -->
    <bike-tag-button
      class="button-group__middle"
      :text="$t('menu.hint')"
      :variant="'bold'"
      @click="$emit('toggle-modal', true)"
    />
    <!-- Right Button -->
    <bike-tag-button class="button-group__right" :text="$t('menu.players')" @click="goPlayersPage" />
  </div>
  <div class="row">
    <div class="col-md-2">
      <a href="https://github.com/KenEucker/biketag-vue">
        <img src="../assets/images/github-logo.png" alt="GitHub" />
        <img src="../assets/images/github-mark.png" alt="GitHub Mark" />
      </a>
      <span><sup>0</sup>{{ $t('components.footer.sourced') }}</span>
      <img class="flow" src="../assets/images/bidirectional-flow.svg" />
      <span>{{ $t('components.footer.deployed') }}<sup>1</sup></span>
      <a href="https://www.netlify.com/">
        <img src="../assets/images/netlify-logo-dark.svg" alt="Netlify" />
      </a>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
export default defineComponent({
  name: 'BikeTagFooter',
  components: {
    BikeTagButton,
  },
  emits: ['toggle-modal'],
  data() {
    return {
      //   modalActive: false,
    }
  },
  methods: {
    goAboutPage: function () {
      this.$router.push('/about')
    },
    goLeaderboardPage: function () {
      this.$router.push('/leaderboard')
    },
    goPlayersPage: function () {
      this.$router.push('/players')
    },
  },
})
</script>
<style scoped lang="scss">
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;

  // &__left {
  // }

  &__middle {
    margin-left: 0.5rem;
  }

  &__right {
    margin-left: 0.5rem;
  }
}
</style>
