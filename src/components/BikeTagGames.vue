<template>
  <div class="container">
    <h3 v-if="showHeading">{{ title ?? $t('components.games.games_title') }}</h3>
    <hr v-if="showHeading" :style="`background-image: url(${styledHr})`" />
    <div class="games">
      <div class="m-auto games__list">
        <div v-for="(game, index) in getAllGames" :key="index" class="games__list__biketag">
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
import StyledHr from '@/assets/images/hr.svg'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTagGames',
  props: {
    variant: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: null,
    },
    showHeading: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      styledHr: StyledHr,
    }
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl']),
  },
})
</script>
<style lang="scss" scoped>
@import '../assets/styles/style';

hr {
  width: 90%;
  margin: 1rem auto;
  height: 13px;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100%;
}

.games {
  flex-direction: column;

  &__list {
    display: flex;
    flex-flow: wrap;
    max-width: 80vw;
    justify-content: center;
    height: 100% !important;

    &__biketag {
      display: flex;
      justify-content: center;
      align-items: center;

      img {
        width: 8rem;
        height: auto;
      }
    }
  }

  @media (min-width: $breakpoint-desktop) {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 1rem;

    &__list {
      grid-column: 1 / span 2;
    }
  }
}

@media (min-width: 600px) {
  hr,
  .header {
    width: 80%;
    margin: 1rem auto;
  }

  .header {
    h5 {
      margin-left: 0.5rem;
    }
  }
}
</style>