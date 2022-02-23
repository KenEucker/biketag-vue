<template>
  <div class="container col-lg-8 play-biketag">
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <div v-if="getCurrentBikeTag" class="rel">
      <bike-tag
        v-if="tagnumber === 0"
        :tag="getCurrentBikeTag"
        :tagnumber="getCurrentBikeTag.tagnumber"
        :mystery-image-url="getCurrentBikeTag.mysteryImageUrl"
        :mystery-player="getPlayer(getCurrentBikeTag.mysteryPlayer)"
        :player="getCurrentBikeTag.mysteryPlayer"
        size="l"
        :mystery-description="$t('pages.play.mystery').toLocaleUpperCase()"
      />
      <bike-tag
        v-else
        size="l"
        :tag="tag"
        :found-player="getPlayer(tag.foundPlayer)"
        :mystery-player="getPlayer(tag.mysteryPlayer)"
        @load="tagLoaded"
      />
    </div>
    <div v-else>
      <span>{{ $t('pages.play.game_not_exists') }}</span>
      <span>{{ $t('pages.play.send_hello_email') }}</span>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
// import useSWRV from 'swrv'

export default defineComponent({
  name: 'PlayView',
  components: {
    BikeTag,
    Loading,
  },
  data() {
    // const { data, error } = useSWRV('/api/game', this.$store.dispatch('setGame'), {})
    // console.log({ data, error })

    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
      tagIsLoading: true,
      // error,
    }
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag', 'getCurrentHint', 'getTags', 'getPlayers']),
    tag() {
      if (this.tagnumber !== 0) {
        const tag = this.getTags?.filter((t) => t.tagnumber === this.tagnumber)
        return tag && tag.length ? tag[0] : {}
      }
      return undefined
    },
  },
  async created() {
    this.tagIsLoading = true
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    this.tagIsLoading = false
  },
  methods: {
    tagLoaded() {
      this.tagIsLoading = false
    },
    getPlayer(playerName) {
      const playerList =
        this.getPlayers?.filter((player) => {
          return decodeURIComponent(encodeURIComponent(player.name)) == playerName
        }) ?? []
      return playerList[0]
    },
  },
})
</script>
<style lang="scss">
.play-biketag {
  .polaroid img {
    animation: fadeIn 2s;
    max-height: 45vh;
  }
}
@media (min-width: 1024px) {
  .play-biketag {
    .polaroid img {
      animation: fadeIn 2s;
      max-height: 60vh;
    }
  }
}
</style>
