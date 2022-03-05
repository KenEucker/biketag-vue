<template>
  <div class="col-lg-8 play-biketag">
    <bike-tag-header />
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <div v-if="getCurrentBikeTag" class="rel home-screen">
      <!-- <img :src="getCurrentBikeTag.mysteryImageUrl" class="home-screen__image" alt="" /> -->
      <ExpandableImage
        class="home-screen__image"
        :src="getCurrentBikeTag.mysteryImageUrl"
        :full-source="getCurrentBikeTag.mysteryImageUrl"
        :alt="getCurrentBikeTag.hint"
      />
      <div class="home-screen__label-group-top">
        <!-- <bike-tag-button
          :text="getCurrentBikeTag.mysteryPlayer"
          @click="$router.push('/player/' + getCurrentBikeTag.mysteryPlayer)"
        /> -->
      </div>
      <div class="home-screen__label-group-bottom">
        <div class="home-screen__label-group-bottom-number">
          <bike-tag-button class="clear-button-height" :text="'#' + getCurrentBikeTag.tagnumber" />
        </div>
        <div>
          <bike-tag-button :text="$t('menu.mysterylocation')" />
        </div>

        <!-- Modal -->
        <b-modal v-model="modalShow" title="BootstrapVue" hide-footer hide-header>
          <!-- Header Content -->
          <div class="modal-top">
            <img class="close-btn" src="@/assets/images/lightbulb.svg" />
            <bike-tag-button class="modal-top__mystery" variant="medium" :text="'Mystery Hint'" />
            <img class="close-btn" src="@/assets/images/close.svg" @click="toggleModal(false)" />
          </div>
          <!-- Line Separator -->
          <div class="modal-line-divide"></div>
          <!-- Hint Content -->
          <div class="modal-bottom">
            <div class="modal-bottom__hint">{{ getCurrentBikeTag.hint }}</div>
            <img
              class="modal-bottom__underline"
              :src="require('@/assets/images/underline.svg')"
              alt="Underline"
            />
          </div>
        </b-modal>
      </div>
    </div>
    <div v-else>
      <span>{{ $t('pages.play.game_not_exists') }}</span>
      <span>{{ $t('pages.play.send_hello_email') }}</span>
    </div>
    <bike-tag-footer class="bike-tag-footer" @toggle-modal="toggleModal" />
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
import ExpandableImage from '@/components/ExpandableImage.vue'
// import useSWRV from 'swrv'

export default defineComponent({
  name: 'PlayView',
  components: {
    Loading,
    BikeTagHeader,
    BikeTagFooter,
    BikeTagButton,
    ExpandableImage,
  },
  data() {
    // const { data, error } = useSWRV('/api/game', this.$store.dispatch('setGame'), {})
    // console.log({ data, error })

    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
      tagIsLoading: true,
      modalShow: false,
      // error,
    }
  },
  computed: {
    ...mapGetters(['getCurrentBikeTag', 'getTags', 'getPlayers', 'getImgurImageSized']),
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
  mounted() {
    this.parseHint()
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
    parseHint(hint) {
      console.log(hint)
    },
    toggleModal(modalStatus) {
      //   this.modalShow = !this.modalShow
      this.modalShow = modalStatus
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
    max-width: 40rem;
    margin: auto;
    // object-fit: cover;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
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

.modal {
  &-top {
    display: flex;
    padding: 0;
    justify-content: space-around;

    &__mystery {
      min-height: auto !important;
    }
  }

  &-bottom {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &__underline {
      height: 3rem;
      width: auto;
    }

    &__hint {
      margin-top: 1rem;
      font-size: 2rem;
      font-family: 'Prequel';
      text-align: center;
    }
  }

  &-line-divide {
    height: 1px;
    width: 90%;
    margin: auto;
    background: linear-gradient(45deg, rgba(100, 100, 100, 0.8), rgba(150, 150, 150, 0.5) 70.71%);
  }

  &-body {
    padding-bottom: 0;
  }
}
</style>
