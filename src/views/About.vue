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
      <div class="m-auto games">
        <div v-for="(game, index) in getAllGames" :key="index" class="biketag-game">
          <a :href="`https://${game.name}.biketag.io`">
            <img :src="getLogoUrl('s', game.logo)" /> </a
          ><br />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import HtmlContent from '@/components/HtmlContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'

export default defineComponent({
  name: 'AboutView',
  components: {
    HtmlContent,
    BikeTagButton,
  },
  data() {
    return {
      styledHr: StyledHr,
      pin: Pin,
    }
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl']),
  },
  created() {
    document.getElementById('app').classList.add('white-bck')
    window.onpopstate = () => {
      window.onpopstate = null
      document.getElementById('app').classList.remove('white-bck')
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

.games {
  display: flex;
  flex-flow: wrap;
  max-width: 80vw;
  justify-content: center;
  height: 100% !important;
}

img {
  width: 100%;
}

.biketag-game {
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    width: 8rem;
    height: auto;
  }
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
  @media (min-width: $breakpoint-desktop) {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 1rem;

    .games {
      grid-column: 1 / span 2;
    }
  }
}
</style>
