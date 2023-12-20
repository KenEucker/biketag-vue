<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <!-- <h2>{{ $t('pages.about.title') }}</h2> -->
      <div class="about__block">
        <h3>
          {{ $t('pages.about.article1.title') }} <img class="about__icon" :src="pin" alt="about" />
        </h3>
        <hr class="about__hr" :style="`background-image: url(${styledHr})`" />
        <section-content filename="docs/about-game.html" />
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
        <section-content filename="docs/about-app.html" />
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
        <section-content filename="docs/about-profile.html" />
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
      <div class="about__block">
        <h3>{{ $t('pages.about.article4.title') }}</h3>
        <hr class="about__hr" :style="`background-image: url(${styledHr})`" />
        <section-content
          v-if="aboutOrganizationContent === ''"
          :content="showOrganizationContent"
        />
        <section-content
          v-else-if="aboutOrganizationContent === 'terms_of_service'"
          filename="docs/terms_of_service.md"
        />
        <section-content
          v-else-if="aboutOrganizationContent === 'code_of_conduct'"
          filename="docs/code_of_conduct.md"
        />
        <section-content
          v-else-if="aboutOrganizationContent === 'privacy_policy'"
          filename="docs/privacy_policy.html"
        />
        <p>
          <bike-tag-button
            variant="medium-blue"
            class="m-1 big-btn"
            @click="showContent('terms_of_service')"
          >
            {{ $t('pages.about.article4.terms_of_service') }}
          </bike-tag-button>
          <bike-tag-button
            variant="medium-green"
            class="m-1 big-btn"
            @click="showContent('code_of_conduct')"
          >
            {{ $t('pages.about.article4.code_of_conduct') }}
          </bike-tag-button>
          <bike-tag-button
            variant="medium-purple"
            class="m-1 big-btn"
            @click="showContent('privacy_policy')"
          >
            {{ $t('pages.about.article4.privacy_policy') }}
          </bike-tag-button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup name="AboutView">
import { ref } from 'vue'
import StyledHr from '@/assets/images/hr.svg'
import Pin from '@/assets/images/pin.svg'

// components
import SectionContent from '@/components/SectionContent.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagGames from '@/components/BikeTagGames.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'
import { useI18n } from 'vue-i18n'

// data
const styledHr = StyledHr
const pin = Pin
const { t } = useI18n()
const aboutOrganizationContent = ref('')
const showOrganizationContent =
  'Click on any of the buttons below to display more content about the BikeTag Project.'

const showContent = (content) => (aboutOrganizationContent.value = content)
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
