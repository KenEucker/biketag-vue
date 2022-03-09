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
    <bike-tag-button class="button-group__right" :text="$t('menu.players')" @click="goUsersPage" />
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
    goUsersPage: function () {
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
