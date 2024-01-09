<template>
  <div class="container">
    <h3 v-if="props.showHeading">{{ props.title ?? $t('components.games.games_title') }}</h3>
    <hr v-if="props.showHeading" :style="`background-image: url(${styledHr})`" />
    <div class="games">
      <div class="m-auto games__list">
        <div v-for="(game, index) in getAllGames" :key="index" class="games__list__biketag">
          <a :href="`https://${game.slug}.biketag.org`">
            <img :src="getLogoUrl('s', game.logo)" alt="BikeTag Logo" /> </a
          ><br />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="BikeTagGames">
import { computed } from 'vue'

import StyledHr from '@/assets/images/hr.svg'
import { useBikeTagStore } from '@/store/index'
import { useI18n } from 'vue-i18n'

// props
const props = defineProps({
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
})

// data
const styledHr = StyledHr
const store = useBikeTagStore()
const { t } = useI18n()

// computed
const getAllGames = computed(() => store.getAllGames)
const getLogoUrl = computed(() => store.getLogoUrl)
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
    gap: 2.5em;
    justify-content: center;
    height: 100% !important;

    &__biketag {
      display: flex;
      justify-content: center;
      align-items: center;

      img {
        width: auto;
        height: auto;
        max-width: 125px;
        max-height: 100px;
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

@media (width >= 600px) {
  hr,
  .header {
    width: 80%;
    margin: 1rem auto;
  }

  .header {
    h2 {
      margin-left: 0.5rem;
    }
  }
}
</style>
