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
        <a href="https://portland.biketag.org">
          <img
            src="https://biketag.org/public/img/pdx-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://denver.biketag.org">
          <img
            src="https://biketag.org/public/img/denver-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://indianapolis.biketag.org">
          <img
            src="https://biketag.org/public/img/indianapolis-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://seattle.biketag.org">
          <img
            src="https://biketag.org/public/img/seattle-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://vancouver.biketag.org">
          <img
            src="https://biketag.org/public/img/vancouver-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://vienna.biketag.org">
          <img
            src="https://biketag.org/public/img/vienna-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://miami.biketag.org">
          <img
            src="https://biketag.org/public/img/miami-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://inverness.biketag.org">
          <img
            src="https://biketag.org/public/img/inverness-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://abbotsford.biketag.org">
          <img
            src="https://biketag.org/public/img/abbotsford-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://comoxvalley.biketag.org">
          <img
            src="https://biketag.org/public/img/comox-valley-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://cowichanvalley.biketag.org">
          <img
            src="https://biketag.org/public/img/cowichan-valley-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://paris.biketag.org">
          <img
            src="https://biketag.org/public/img/paris-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://hull.biketag.org">
          <img
            src="https://biketag.org/public/img/hull-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://emporia.biketag.org">
          <img
            src="https://biketag.org/public/img/emporia-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://phoenix.biketag.org">
          <img
            src="https://biketag.org/public/img/phoenix-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://charlotte.biketag.org">
          <img
            src="https://biketag.org/public/img/charlotte-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://montreal.biketag.org">
          <img
            src="https://biketag.org/public/img/montreal-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://ottawa.biketag.org">
          <img
            src="https://biketag.org/public/img/ottawa-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://victoria.biketag.org">
          <img
            src="https://biketag.org/public/img/victoria-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://kansascity.biketag.org">
          <img
            src="https://biketag.org/public/img/kansas-city-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://toulouse.biketag.org">
          <img
            src="https://biketag.org/public/img/BikeTag_white-01-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://islamabad.biketag.org">
          <img
            src="https://biketag.org/public/img/islamabad-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://peakdistrict.biketag.org">
          <img
            src="https://biketag.org/public/img/peak-district-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://chilliwack.biketag.org">
          <img
            src="https://biketag.org/public/img/chilliwack-biketag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://dayton.biketag.org">
          <img
            src="https://biketag.org/public/img/dayton-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://peoria.biketag.org">
          <img
            src="https://biketag.org/public/img/peoria-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://munich.biketag.org">
          <img
            src="https://biketag.org/public/img/munich-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://newhaven.biketag.org">
          <img
            src="https://biketag.org/public/img/new-haven-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://gatineau.biketag.org">
          <img
            src="https://biketag.org/public/img/gatineau-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://isleofwight.biketag.org">
          <img
            src="https://biketag.org/public/img/isle-of-wight-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://seacoast.biketag.org">
          <img
            src="https://biketag.org/public/img/seacoast-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://princegeorge.biketag.org">
          <img
            src="https://biketag.org/public/img/prince-george-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://calgary.biketag.org">
          <img
            src="https://biketag.org/public/img/calgary-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://santabarbara.biketag.org">
          <img
            src="https://biketag.org/public/img/santa-barbara-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://bangor.biketag.org">
          <img
            src="https://biketag.org/public/img/bangor-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://3city.biketag.org">
          <img
            src="https://biketag.org/public/img/3-city-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://ventura.biketag.org">
          <img
            src="https://biketag.org/public/img/ventura-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />

        <a href="https://ljubljana.biketag.org">
          <img
            src="https://biketag.org/public/img/ljubljana-bike-tag-small.png"
            alt="d0ced108-2de4-4180-8e86-47d077c48307"
          /> </a
        ><br />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import HtmlContent from '@/components/HtmlContent.vue'

export default defineComponent({
  name: 'PlayerView',
  components: {
    HtmlContent,
  },
  computed: {
    // mix the getters into computed with object spread operator
    ...mapGetters(['getPlayers']),
    player() {
      const playerList = this.getPlayers.filter((player) => {
        const playerName = this.playerName()
        return decodeURIComponent(encodeURIComponent(player.name)) == playerName
      })
      const player = playerList[0]
      return player
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
  },
  methods: {
    playerName() {
      return decodeURIComponent(encodeURIComponent(this.$route.params.name))
    },
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
