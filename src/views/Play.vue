<template>
  <div class="container col-lg-8 play-biketag">
    <bike-tag-header />
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <div v-if="getCurrentBikeTag" class="rel"></div>
    <div v-else>
      <span>{{ $t('pages.play.game_not_exists') }}</span>
      <span>{{ $t('pages.play.send_hello_email') }}</span>
    </div>
    <bike-tag-footer />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'
// import useSWRV from 'swrv'

export default defineComponent({
  name: 'PlayView',
  components: {
    Loading,
    BikeTagHeader,
    BikeTagFooter,
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
    ...mapGetters(['getCurrentBikeTag', 'getTags', 'getPlayers']),
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
    await this.$store.dispatch('setTags', true)
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
  background-color: white;
}
</style>
