<template>
  <div class="play-biketag">
    <div class="play-screen__label-group-top">
      <bike-tag-header />
    </div>
    <loading v-show="!getGame" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <!-- Image and Number -->
    <div v-if="tagnumber" :class="`tag-screen ${downloadingTag ? 'downloading flash' : ''}`">
      <bike-tag id="the-tag" :tag="tag" :use-large-src-images="true" />
      <bike-tag-button class="tag-screen-download__button" text="Download" @click="downloadTag" />
    </div>
    <div v-else>
      <bike-tag-button
        :text="getCurrentBikeTag.mysteryPlayer"
        @click="$router.push('/player/' + getCurrentBikeTag.mysteryPlayer)"
      />
      <div v-if="getCurrentBikeTag" class="rel play-screen">
        <ExpandableImage
          class="play-screen__image"
          :src="getCurrentBikeTag.mysteryImageUrl"
          :full-source="getCurrentBikeTag.mysteryImageUrl"
          :alt="getCurrentBikeTag.hint"
        />

        <bike-tag-button
          class="play-screen__label-group-number"
          :text="'#' + getCurrentBikeTag.tagnumber"
        />
        <div class="play-screen__label-group-bottom">
          <div>
            <bike-tag-label :text="$t('menu.mysterylocation')" />
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
    </div>
    <bike-tag-footer class="bike-tag-footer" @toggle-modal="toggleModal" />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'
import BikeTagLabel from '@/components/BikeTagLabel.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import { exportHtmlToDownload } from '@/common/utils'
// import useSWRV from 'swrv'

export default defineComponent({
  name: 'PlayView',
  components: {
    Loading,
    BikeTag,
    BikeTagHeader,
    BikeTagFooter,
    BikeTagButton,
    BikeTagLabel,
    ExpandableImage,
  },
  data() {
    // const { data, error } = useSWRV('/api/game', this.$store.dispatch('setGame'), {})
    // console.log({ data, error })

    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
      modalShow: false,
      downloadingTag: false,
      // error,
    }
  },
  computed: {
    ...mapGetters([
      'getCurrentBikeTag',
      'getTags',
      'getGameName',
      'getPlayers',
      'getImgurImageSized',
    ]),
    tag() {
      if (this.tagnumber !== 0) {
        const tag = this.getTags?.filter((t) => t.tagnumber === this.tagnumber)
        return tag && tag.length ? tag[0] : {}
      }
      return undefined
    },
  },
  methods: {
    tagLoaded() {
      this.tagIsLoading = false
    },
    async downloadTag() {
      this.downloadingTag = true
      const downloadPrefix = `BikeTag-${this.getGameName}-${this.tagnumber}--`
      await exportHtmlToDownload(`${downloadPrefix}found`, undefined, '#the-tag .found-tag')
      await exportHtmlToDownload(`${downloadPrefix}mystery`, undefined, '#the-tag .mystery-tag')
      this.downloadingTag = false
    },
    getPlayer(playerName) {
      const playerList =
        this.getPlayers?.filter((player) => {
          return decodeURIComponent(encodeURIComponent(player.name)) == playerName
        }) ?? []
      return playerList[0]
    },
    toggleModal(modalStatus) {
      //   this.modalShow = !this.modalShow
      this.modalShow = modalStatus
    },
  },
})
</script>
<style lang="scss">
.play-biketag {
  .downloading {
    .tag-number {
      display: none;
    }
  }
}
</style>
<style lang="scss">
@import '../assets/styles/style';

.play-screen {
  position: relative;
  width: 80vw;
  max-width: 750px;
  height: auto;
  margin: auto;

  @media (max-width: $breakpoint-mobile-lg) {
    width: 100vw;
  }

  &__image {
    width: 80vw;
    max-width: 750px;
    height: auto;
    margin: auto;
    box-shadow: 0 1px 3px rgb(0 0 0 / 12%), 0 1px 2px rgb(0 0 0 / 24%);

    &.expanded {
      max-width: unset;
    }

    @media (max-width: $breakpoint-mobile-lg) {
      width: 100vw;
    }
  }

  &__label-group {
    &-number {
      position: absolute;
      top: -3%;
      left: 0;
      // line-height: 1rem !important;
      min-width: 1rem;
      @media (min-width: $breakpoint-tablet) {
        top: 0;
        min-width: 8rem;
      }
    }

    &-top {
      margin-bottom: -1.25rem;
      z-index: 1;
      position: relative;
    }

    &-bottom {
      position: absolute;
      bottom: -3.5rem;
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
      width: auto;
      height: 3rem;
    }

    &__hint {
      margin-top: 1rem;
      font-size: 2rem;
      font-family: $default-secondary-font-family;
      text-align: center;
    }
  }

  &-line-divide {
    width: 90%;
    height: 1px;
    margin: auto;
    background: linear-gradient(45deg, rgb(100 100 100 / 80%), rgb(150 150 150 / 50%) 70.71%);
  }

  &-body {
    padding-bottom: 0;
  }

  .flash {
    opacity: 1;
    animation: flash 1s;
  }
  @-webkit-keyframes flash {
    0% {
      opacity: 0.3;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes flash {
    0% {
      opacity: 0.3;
    }
    100% {
      opacity: 1;
    }
  }
}
</style>
