<template>
  <div :class="`${variant} button-group`">
    <div v-if="variant === 'current'" @click="showHint">
      <!-- Left Button -->
      <bike-tag-button class="button-group__left" :text="$t('menu.map')" @click="goMapPage" />
      <!-- Middle Button -->
      <bike-tag-button
        class="button-group__middle"
        :text="$t('menu.hint')"
        variant="bold"
        id="hint"
      />
      <b-popover hide-header target="hint" triggers="click" placement="top">
        <img :src="hintIcon" class="popover__hint-icon"/>
        <p id="hint-text" class="popover__hint-text"/>
        <img :src="closeRounded" @click="closePopover" class="popover__close"/>
      </b-popover>
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
  <!-- World -->
  <div class="button-reset-cnt">
    <bike-tag-button class="button-reset" variant="circle" @click="goWorldwide">
      <img class="footer-fixed_image" src="@/assets/images/npworld.png" alt="BikeTag World Wide" />
    </bike-tag-button>
  </div>
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
import HintIcon from '@/assets/images/hint-icon.svg'
import HintBackground from '@/assets/images/hint-background.svg'
import CloseRounded from '@/assets/images/close-rounded.svg'

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
      characters: [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
         'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'x', '#',
          '%', '&', '-', '+', '_', '?', '/', '\\', '='],
      timeout: 5,
      iterations: 10,
      hintIcon: HintIcon,
      hintBackground: HintBackground,
      closeRounded: CloseRounded,
      showPopover: false,
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
    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    },
    getRandomInteger(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    randomCharacter() {
      return this.characters[this.getRandomInteger(0, this.characters.length - 1)];
    },
    async showHint(e) {
      const popover = document.querySelector(".popover");
      if (popover) {
        popover.classList.add("popover__wrapper")
        const mysteryHint = document.querySelector('#hint-text')
        const hint = this.getCurrentHint
        mysteryHint.innerText = ""
        window.scrollBy({top: 1})
        for (let i of hint) {
          let j = 0;
          if (document.querySelector(".popover__wrapper")) {
            while (j < this.iterations) {
              mysteryHint.innerText = `${mysteryHint.innerText}${this.randomCharacter()}`
              await this.sleep(this.timeout)
              mysteryHint.innerText = mysteryHint.innerText.slice(0, mysteryHint.innerText.length - 1)
              j++
            }
          } else {
            mysteryHint.innerText = ""
            break
          }
          mysteryHint.innerText = `${mysteryHint.innerText}${i}`
        }
      }
    },
    closePopover(){
      document.getElementById("hint").click();
    },
  },
  beforeUnmount() {
    document.querySelector(".popover")?.remove();
  }
})
</script>
<style lang="scss">
@import '../assets/styles/style';

.popover {
  &__wrapper {
    @include background-btn;
    @include flx-center($jc : center);
    background-image: url("../assets/images/hint-background.svg");
    min-width: 300px;
    min-height: 170px;
    background-color: unset;
    border: unset;

    .popover-arrow {
      display: none;
    }
    .popover-body {
      width: 100%;
    }

    @media (min-width: $breakpoint-mobile-md) {
      min-width: 350px;
      min-height: 190px;
    }
    @media (min-width: $breakpoint-tablet) {
      min-width: 400px;
      min-height: 210px;
    }
  }
  &__hint-icon {
    position: absolute;
    left: 14px;
    top: 35%;
  }
  &__close {
    position: absolute;
    top: -7px;
    right: 0;
  }
  &__hint-text {
    font-weight: 900;
    font-size: 1rem;
    font-family: $default-secondary-font-family;
    cursor: default;
    white-space: pre-wrap;
    text-transform: uppercase;
    word-break: break-all;
    margin: 0;
    max-height: 96px;
    overflow: auto;
    width: 80%;
    margin-left: auto;
  }
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
