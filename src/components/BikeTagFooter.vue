<template>
  <div class="button-group">
    <!-- Left Button -->
    <bike-tag-button class="" :text="$t('menu.about')" @click="goAboutPage" />
    <!-- Middle Button -->
    <bike-tag-button
      class="z-1 button-middle"
      :text="$t('menu.hint')"
      :variant="'bold'"
      @click="$emit('toggle-modal', true)"
    />
    <!-- Right Button -->
    <bike-tag-button class="button-right" :text="$t('menu.players')" @click="goUsersPage" />
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
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
