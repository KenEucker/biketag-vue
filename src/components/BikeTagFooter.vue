<template>
  <div class="container">
    <div class="footer-buttons mb-3">
      <bike-tag-button class="m-1" :text="$t('menu.about')" @click="goAboutPage" />
      <bike-tag-button class="m-1" :text="$t('menu.players')" @click="goUsersPage" />
      <bike-tag-button class="m-1" :text="$t('menu.top10')" @click="goLeaderboardPage" />
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
  methods: {
    goAboutPage: function () {
      this.$router.push('/about')
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
  min-height: 0;

  .btn {
    max-height: 3em;
  }
}
</style>
