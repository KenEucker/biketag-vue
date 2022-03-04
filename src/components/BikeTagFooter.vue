<template>
  <div class="">
    <div class="footer-buttons mb-3">
      <bike-tag-button class="button-left" :text="$t('menu.about')" @click="goAboutPage" />
      <bike-tag-button
        class="z-1 button-middle"
        :text="$t('menu.hint')"
        :variant="'bold'"
        @click="$emit('toggle-modal', true)"
      />
      <bike-tag-button class="button-right" :text="$t('menu.players')" @click="goUsersPage" />
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

  .button {
    &-left {
      margin-right: -0.9375rem;
    }
    &-middle {
      position: relative;
    }
    &-right {
      margin-left: -0.9375rem;
    }
  }
}
</style>
