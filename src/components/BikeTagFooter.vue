<template>
  <div :class="`${variant} button-group`">
    <div v-if="variant === 'current'">
      <!-- Left Button -->
      <bike-tag-button class="button-group__left" :text="$t('menu.map')" @click="goMapPage" />
      <!-- Middle Button -->
      <bike-tag-button
        class="button-group__middle"
        :text="$t('menu.hint')"
        variant="bold"
        @click="showHint"
      />
      <!-- Right Button -->
      <bike-tag-button
        v-if="getQueuedTags?.length"
        class="button-group__right"
        :text="$t('menu.queue')"
        @click="goRoundPage"
      />
      <bike-tag-button
        v-else
        class="button-group__right"
        :text="$t('menu.last')"
        @click="$emit('previous')"
      />
    </div>
    <div v-if="variant === 'single'">
      <!-- Left Button -->
      <bike-tag-button
        class="button-group__left"
        :text="$t('menu.previous')"
        @click="$emit('previous')"
      />
      <!-- Middle Button -->
      <bike-tag-button
        class="tag-screen-download__button"
        variant="bold"
        :text="$t('menu.download')"
        @click="showCamera = true"
      />
      <b-modal
        v-model="showCamera"
        class="camera-modal"
        title="BikeTag Camera"
        hide-footer
        hide-header
      >
        <bike-tag-camera :tag="tag" />
      </b-modal>
      <!-- Right Button -->
      <bike-tag-button class="button-group__right" :text="$t('menu.next')" @click="$emit('next')" />
    </div>
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
  <div class="mt-5 mb-5 foss-container">
    <div class="row">
      <a href="https://github.com/KenEucker/biketag-vue">
        <img src="@/assets/images/github-logo.png" alt="GitHub" />
        <img src="@/assets/images/github-mark.png" alt="GitHub Mark" />
      </a>
      <a href="https://www.netlify.com/">
        <img src="@/assets/images/netlify-logo-dark.svg" alt="Netlify" />
      </a>
    </div>
    <div class="mt-2 row">
      <i>
        BikeTag is an entirely free and open-source project that is on GitHub for open collaboration
        and graciously hosted by Netlify on their free open-source plan.
      </i>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagCamera from '@/components/BikeTagCamera.vue'

export default defineComponent({
  name: 'BikeTagFooter',
  components: {
    BikeTagButton,
    BikeTagCamera,
  },
  props: {
    variant: {
      type: String,
      default: 'current',
    },
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  emits: ['next', 'previous'],
  data() {
    return {
      showCamera: false,
    }
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag', 'getCurrentHint', 'getQueuedTags']),
  },
  methods: {
    goAboutPage() {
      this.$router.push('/about')
    },
    goLeaderboardPage() {
      this.$router.push('/leaderboard')
    },
    goPlayersPage() {
      this.$router.push('/players')
    },
    goMapPage() {
      this.$router.push('/map')
    },
    goRoundPage() {
      this.$router.push('/round')
    },
    showHint() {
      const mysteryLabel = document.querySelector('#mystery-label p')
      if (mysteryLabel.innerText.toLowerCase() === this.$t('menu.mysterylocation').toLowerCase()) {
        mysteryLabel.innerText = this.getCurrentHint
      } else {
        mysteryLabel.innerText = this.$t('menu.mysterylocation')
      }
      mysteryLabel.classList.toggle('hint-anim')
    },
  },
})
</script>
<style lang="scss">
@import '../assets/styles/style';

.hint-anim {
  animation: typewriter 0.5s 1 normal both;
}
</style>
<style scoped lang="scss">
.foss-container {
  i {
    margin: auto;
    padding: 2em;
    max-width: 500px;
  }
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
