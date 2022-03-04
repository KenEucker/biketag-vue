<template>
  <div class="col-lg-8 play-biketag">
    <bike-tag-header />
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <div v-if="getCurrentBikeTag" class="rel home-screen">
      <img :src="getCurrentBikeTag.mysteryImageUrl" class="home-screen__image" alt="" />
      <div class="home-screen__label-group-top">
        <bike-tag-button
          :text="getCurrentBikeTag.mysteryPlayer"
          @click="$router.push('/player/' + getCurrentBikeTag.mysteryPlayer)"
        />
      </div>
      <div class="home-screen__label-group-bottom">
        <div class="home-screen__label-group-bottom-number">
          <bike-tag-button class="clear-button-height" :text="'#' + getCurrentBikeTag.tagnumber" />
        </div>
        <div>
          <bike-tag-button :text="'Mystery Location'" />
        </div>
      </div>
    </div>
    <div v-else>
      <span>{{ $t('pages.play.game_not_exists') }}</span>
      <span>{{ $t('pages.play.send_hello_email') }}</span>
    </div>
    <bike-tag-footer class="bike-tag-footer" />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
// import useSWRV from 'swrv'

export default defineComponent({
  name: 'PlayView',
  components: {
    Loading,
    BikeTagHeader,
    BikeTagFooter,
    BikeTagButton,
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
.home-screen {
  position: relative;
  margin-top: 2rem;

  &__image {
    height: 20.5rem;
    width: 100%;
    object-fit: cover;
  }

  &__label-group {
    &-top {
      display: flex;
      position: absolute;
      width: 100%;
      justify-content: center;
      top: -4rem;
      left: 0;
    }

    &-bottom {
      position: absolute;
      bottom: -4.5rem;
      display: flex;
      flex-direction: column;
      width: 100%;

      &-number {
        margin-bottom: -2.5rem;
        z-index: 2;
      }
    }
  }
}

.clear-button-height {
  min-height: 0px !important;
}

.bike-tag-footer {
  margin-top: 4rem;
}

.play-biketag {
  margin: auto;
}
</style>
