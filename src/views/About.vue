<template>
  <div class="container">
    <div class="about d-flex justify-content-center">
      <h2>{{ $t('pages.about.title') }}</h2>
      <hr />
      <h3>{{ $t('pages.about.article1.title') }}</h3>
      <html-content filename="about-game.html" />
      <p>
        <b-button
          variant="secondary"
          class="m-1"
          onclick="window.open('https://patreon.com/biketag')"
        >
          {{ $t('pages.about.article1.support_biketag') }}
        </b-button>
      </p>
      <h3>{{ $t('pages.about.article2.title') }}</h3>
      <html-content filename="about-app.html" />
      <p>
        <b-button
          variant="primary"
          class="m-1"
          onclick="window.open('https://patreon.com/biketag')"
        >
          {{ $t('pages.about.article2.become_player') }}
        </b-button>
      </p>
      <div class="m-auto games">
        <div v-for="(game, index) in getAllGames" :key="index" class="biketag-game">
          <a :href="`https://${game.name}.biketag.io`"> <img :src="getLogoUrl('s', game.logo)" /> </a
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

export default defineComponent({
  name: 'AboutView',
  components: {
    HtmlContent,
  },
  computed: {
    ...mapGetters(['getAllGames', 'getLogoUrl']),
  },
  async mounted() {
    await this.$store.dispatch('setAllGames')
  },
})
</script>
<style scoped lang="scss">
.games {
  display: flex;
  flex-flow: wrap;
  max-width: 80vw;
  justify-content: center;
  height: 100% !important;
}

.about {
  flex-direction: column;
}

img {
  max-width: 10em;
}
</style>
