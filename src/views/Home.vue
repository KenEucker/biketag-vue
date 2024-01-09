<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="play-biketag vld-parent">
    <div class="play-screen__label-group-top">
      <bike-tag-header />
    </div>
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" :is-full-page="false">
      <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
    </loading>
    <div class="container" :class="`${tagIsLoading ? 'tag-hidden' : ''}`">
      <!-- Image and Number -->
      <div v-if="tagnumber" class="m-4 mt-5 tag-screen">
        <bike-tag id="the-tag" :tag="tag" image-size="l" />
      </div>
      <div v-else class="mb-5">
        <div class="play-screen__mystery-player">
          <bike-tag-button
            variant="medium"
            class="play-screen__mystery-player__button"
            :text="getCurrentBikeTag?.mysteryPlayer"
            @click="router.push('/player/' + encodeURIComponent(getCurrentBikeTag?.mysteryPlayer))"
          />
        </div>
        <div v-if="getCurrentBikeTag" class="rel play-screen">
          <expandable-image
            class="play-screen__image"
            :source="getImgurImageSized(getCurrentBikeTag?.mysteryImageUrl, 'l')"
            :full-source="getCurrentBikeTag?.mysteryImageUrl"
            :alt="getCurrentBikeTag?.hint"
            @loaded="tagImageLoaded"
          />

          <bike-tag-button
            class="play-screen__label-group-number"
            :text="'#' + getCurrentBikeTag?.tagnumber"
          />
          <div class="play-screen__label-group-bottom">
            <div>
              <bike-tag-label
                id="mystery-label"
                :text="$t('menu.mysterylocation')"
                :only-text="true"
              />
            </div>
          </div>
        </div>
        <div v-else>
          <span>{{ t('pages.play.game_not_exists') }}</span>
          <span>{{ t('pages.play.send_hello_email') }}</span>
        </div>
      </div>
    </div>
    <bike-tag-footer
      :class="`bike-tag-footer ${tagIsLoading ? 'padded' : ''}`"
      :variant="`${tagnumber ? 'single' : 'current'}`"
      :tag="tag"
      @next="goNextSingle"
      @previous="goPreviousSingle"
    />
  </div>
</template>

<script setup name="HomeView">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import 'vue-loading-overlay/dist/vue-loading.css'
// import useSWRV from 'swrv'

// components
import Loading from 'vue-loading-overlay'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagHeader from '@/components/BikeTagHeader.vue'
import BikeTagFooter from '@/components/BikeTagFooter.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagLabel from '@/components/BikeTagLabel.vue'
import ExpandableImage from '@/components/ExpandableImage.vue'
import { useI18n } from 'vue-i18n'

// data
const router = useRouter()
const route = useRoute()
let tagnumber = ref(route.params?.tagnumber ? parseInt(route.params.tagnumber) : 0)
const tagIsLoading = ref(true)
const store = useBikeTagStore()
const { t } = useI18n()

// computed
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getImgurImageSized = computed(() => store.getImgurImageSized)
const getTags = computed(() => store.getTags)

/// Support legacy webHashHistory urls
if (tagnumber.value === 0 && window.location.hash.indexOf('#/') === 0) {
  tagnumber.value = parseInt(window.location.hash.split('#/')[1])
}

const tag = computed(() => {
  if (tagnumber.value !== 0) {
    const tag = getTags.value?.filter((t) => t.tagnumber === tagnumber.value)
    return tag && tag.length ? tag[0] : {}
  }
  return {}
})

// methods
function tagImageLoaded() {
  tagIsLoading.value = false
}
function goNextSingle() {
  tagnumber.value++
  if (tagnumber.value === getCurrentBikeTag.value.tagnumber) {
    tagnumber.value = 0
  } else {
    router.push(`/${tagnumber.value}`)
  }
}
function goPreviousSingle() {
  tagnumber.value = tagnumber.value > 0 ? tagnumber.value : getCurrentBikeTag.value.tagnumber
  tagnumber.value--
  router.push(`/${tagnumber.value}`)
}

// mounted
onMounted(() => (tagIsLoading.value = tagnumber.value === 0))
</script>

<style lang="scss">
@import '../assets/styles/style';

.tag-hidden {
  visibility: hidden;
  opacity: 0.1;
  height: 500px;
}

.play-screen {
  position: relative;
  width: 80vw;
  max-width: 750px;
  height: 70vh;
  margin: auto;

  // @media (max-width: $breakpoint-mobile-lg) {
  //   width: 100vw;
  // }
  @media (width <= 767px) {
    height: 60vh;
  }

  @media (width <= 479px) {
    height: 50vh;
  }

  &__mystery-player {
    position: relative;
    z-index: 1;

    &__button {
      margin-top: -40px;
      bottom: -40px;
      position: relative;
      width: 80%;
      max-width: $btn-max-width;
    }
  }

  &__image {
    object-fit: cover;
    max-width: 750px;
    max-height: 70vh;
    margin: auto;

    &.expanded {
      max-width: unset;
      max-height: unset;
    }

    // @media (max-width: $breakpoint-mobile-lg) {
    //   width: 100vw;
    // }
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

  &.padded {
    top: 400px;
    position: absolute;
    left: 25%;
    right: 25%;
  }

  i {
    font-size: 2rem;
  }
}

.play-biketag {
  margin: auto;
}

.camera-modal {
  background: transparent;

  .modal-content {
    background: none;
    border: none;
  }

  //   &-top {
  //     display: flex;
  //     padding: 0;
  //     justify-content: space-around;

  //     &__mystery {
  //       min-height: auto !important;
  //     }
  //   }

  //   &-bottom {
  //     display: flex;
  //     flex-direction: column;
  //     justify-content: center;
  //     align-items: center;

  //     &__underline {
  //       width: auto;
  //       height: 3rem;
  //     }

  //     &__hint {
  //       margin-top: 1rem;
  //       font-size: 2rem;
  //       font-family: $default-secondary-font-family;
  //       text-align: center;
  //     }
  //   }

  //   &-line-divide {
  //     width: 90%;
  //     height: 1px;
  //     margin: auto;
  //     background: linear-gradient(45deg, rgb(100 100 100 / 80%), rgb(150 150 150 / 50%) 70.71%);
  //   }

  //   &-body {
  //     padding-bottom: 0;
  //   }

  //   .flash {
  //     opacity: 1;
  //     animation: flash 1s;
  //   }
  //   @-webkit-keyframes flash {
  //     0% {
  //       opacity: 0.3;
  //     }
  //     100% {
  //       opacity: 1;
  //     }
  //   }
  //   @keyframes flash {
  //     0% {
  //       opacity: 0.3;
  //     }
  //     100% {
  //       opacity: 1;
  //     }
  //   }
}
</style>
