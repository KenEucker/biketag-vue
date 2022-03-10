<template>
  <div class="button-group">
    <!-- Left Button -->
    <bike-tag-button class="button-group__left" :text="$t('menu.about')" @click="goAboutPage" />
    <!-- Middle Button -->
    <bike-tag-button class="button-group__middle" :text="$t('menu.hint')" variant="bold" />
    <!-- Right Button -->
    <bike-tag-button
      class="button-group__right"
      :text="$t('menu.players')"
      @click="goPlayersPage"
    />
  </div>
  <!-- <b-modal title="Current BikeTag Hint" hide-footer hide-header>
      <div class="modal-top">
        <img class="close-btn" src="@/assets/images/lightbulb.svg" />
        <bike-tag-button class="modal-top__mystery" variant="medium" :text="'Mystery Hint'" />
        <img class="close-btn" src="@/assets/images/close.svg" @click="toggleModal(false)" />
      </div>
      <div class="modal-line-divide"></div>
      <div class="modal-bottom">
        <div class="modal-bottom__hint">{{ getCurrentBikeTag.hint }}</div>
        <img
          class="modal-bottom__underline"
          :src="require('@/assets/images/underline.svg')"
          alt="Underline"
        />
      </div>
    </b-modal> -->
  <div class="brands-cnt">
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
import { mapGetters } from 'vuex'
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
  computed: {
    ...mapGetters(['getCurrentBikeTag']),
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
.brands-cnt {
  display: flex;
  justify-content: center;
}
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
