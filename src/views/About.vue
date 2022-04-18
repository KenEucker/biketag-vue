<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <!-- <h2>{{ $t('pages.about.title') }}</h2> -->
      <div class="about__block">
        <h3>{{ $t('pages.about.article1.title') }} <img class="about__icon" :src="pin" /></h3>
        <hr class="about__hr" :style="`background-image: url(${styledHr})`" />
        <html-content filename="about-game.html" />
        <p>
          <bike-tag-button
            variant="medium-orange"
            class="m-1 big-btn"
            onclick="window.open('https://patreon.com/biketag')"
          >
            {{ $t('pages.about.article1.support_biketag') }}
          </bike-tag-button>
        </p>
      </div>
      <div class="about__block">
        <h3>{{ $t('pages.about.article2.title') }}</h3>
        <hr class="about__hr" :style="`background-image: url(${styledHr})`" />
        <html-content filename="about-app.html" />
        <p>
          <bike-tag-button
            variant="medium-orange"
            class="m-1 big-btn"
            onclick="window.open('https://patreon.com/biketag')"
          >
            {{ $t('pages.about.article2.become_player') }}
          </bike-tag-button>
        </p>
      </div>
      <bike-tag-map variant="worldwide" />
      <bike-tag-games class="mt-5 mb-5" />
      <div class="about__block">
        <h3>{{ $t('pages.about.article3.title') }}</h3>
        <hr class="about__hr" :style="`background-image: url(${styledHr})`" />
        <html-content filename="about-profile.html" />
        <p>
          <bike-tag-button
            variant="medium-orange"
            class="m-1 big-btn"
            @click="$router.push('/login')"
          >
            {{ $t('pages.about.article3.create_profile') }}
          </bike-tag-button>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagGames from '@/components/BikeTagGames.vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'
import BikeTagMap from '@/components/BikeTagMap.vue'

export default defineComponent({
  name: 'AboutView',
  components: {
    HtmlContent,
    BikeTagButton,
    BikeTagGames,
    BikeTagMap,
  },
  data() {
    return {
      styledHr: StyledHr,
      pin: Pin,
    }
  },
})
</script>
<style lang="scss">
.white-bck {
  background: white !important;
}

.big-btn {
  min-height: 6rem;

  .biketag {
    &__button {
      &--children {
        padding: 0 1rem;
      }
    }
  }
}
</style>
<style scoped lang="scss">
@import '../assets/styles/style';

img {
  width: 100%;
}

.about {
  flex-direction: column;

  &__icon {
    width: unset;
    margin-left: 1rem;
  }

  &__block {
    border: 1px solid;
    padding: 1rem;
    margin-bottom: 2rem;
  }

  &__hr {
    height: 13px;
    background-color: transparent;
    background-repeat: no-repeat;
    background-position: center;
    background-size: 100%;
  }
}
</style>
