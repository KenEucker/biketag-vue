<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
  </loading>
  <b-modal v-model="modal" title="BikeDex" hide-footer hide-header modal-class="trans-bck">
    <div v-if="player" class="container mt-5">
      <bike-dex :tags="player.tags" />
    </div>
  </b-modal>
  <div v-if="player" class="container mt-5">
    <div class="social">
      <player-bicon class="social__cnt--center" size="lg" :player="player" :no-link="true" />
      <div class="social__cnt--left" @click="showModal">
        <img
          class="social__icon"
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0iYmkgYmktYm9vdHN0cmFwLXJlYm9vdCIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNMS4xNjEgOGE2Ljg0IDYuODQgMCAxIDAgNi44NDItNi44NC41OC41OCAwIDEgMSAwLTEuMTYgOCA4IDAgMSAxLTYuNTU2IDMuNDEybC0uNjYzLS41NzdhLjU4LjU4IDAgMCAxIC4yMjctLjk5N2wyLjUyLS42OWEuNTguNTggMCAwIDEgLjcyOC42MzNsLS4zMzIgMi41OTJhLjU4LjU4IDAgMCAxLS45NTYuMzY0bC0uNjQzLS41NkE2LjgxMiA2LjgxMiAwIDAgMCAxLjE2IDh6Ii8+CiAgPHBhdGggZD0iTTYuNjQxIDExLjY3MVY4Ljg0M2gxLjU3bDEuNDk4IDIuODI4aDEuMzE0TDkuMzc3IDguNjY1Yy44OTctLjMgMS40MjctMS4xMDYgMS40MjctMi4xIDAtMS4zNy0uOTQzLTIuMjQ2LTIuNDU2LTIuMjQ2SDUuNXY3LjM1MmgxLjE0MXptMC0zLjc1VjUuMjc3aDEuNTdjLjg4MSAwIDEuNDE2LjQ5OSAxLjQxNiAxLjMyIDAgLjg0LS41MDQgMS4zMjQtMS4zODYgMS4zMjRoLTEuNnoiLz4KPC9zdmc+"
        />
      </div>
      <div v-if="Object.keys(playerSocial ?? {}).length" class="social__cnt--rigth">
        <a
          v-for="(social, i) in Object.keys(playerSocial).filter((s) => s.length)"
          :key="i"
          :href="`${socialLinks[social]}${playerSocial[social]}`"
        >
          <img :id="social" class="social__icon" :src="socialNetworkIcons[social]" />
        </a>
      </div>
    </div>
    <div>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalCount"
        :per-page="perPage"
        aria-controls="itemList"
        align="center"
        @page-click="changePage"
      ></b-pagination>
      <div class="m-auto player-tags">
        <div v-for="tag in tagsForList" :key="tag?.tagnumber">
          <bike-tag
            :key="tag?.tagnumber"
            :tag="tag"
            :show-player="false"
            :found-tagnumber="tag?.tagnumber - 1"
            :found-description="tag?.foundLocation"
          />
        </div>
      </div>
      <b-form-group>
        <select v-model="perPage" class="m-auto form-select w-25" @change="resetCurrentPage">
          <option v-for="i in 3" :key="Math.pow(10, i)" :value="Math.pow(10, i)">
            {{ Math.pow(10, i) }}
          </option>
        </select>
      </b-form-group>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalCount"
        :per-page="perPage"
        aria-controls="itemList"
        align="center"
        @page-click="changePage"
      ></b-pagination>
    </div>
  </div>
</template>

<script setup name="PlayerView">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from '@/store'
import 'vue-loading-overlay/dist/vue-loading.css'
import Reddit from '@/assets/images/Reddit.svg'
import Instagram from '@/assets/images/Instagram.svg'
import Twitter from '@/assets/images/Twitter.svg'
import Imgur from '@/assets/images/Imgur.svg'
import Discord from '@/assets/images/Discord.svg'

// components
import PlayerBicon from '@/components/PlayerBicon.vue'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import BikeDex from '@/components/BikeDex.vue'

// data
const router = useRouter()
const route = useRoute()
const currentPage = ref(route.params?.currentPage.length ? parseInt(route.params?.currentPage) : 1)
const perPage = ref(10)
const tagsAreLoading = ref(true)
const tagsLoaded = ref([])
const playerSocial = ref(null)
const socialNetworkIcons = {
  reddit: Reddit,
  instagram: Instagram,
  twitter: Twitter,
  imgur: Imgur,
  discord: Discord,
}
const socialLinks = {
  imgur: 'http://imgur.com/user/',
  instagram: 'http://instagram.com/',
  twitter: 'http://twitter.com/',
  reddit: 'http://reddit.com/u/',
  discord: '',
}
const modal = ref(false)
const store = useStore()

// computed
const getPlayers = computed(() => store.getPlayers)
const player = computed(() => {
  const playerList = getPlayers.value?.filter((player) => {
    const player_name = playerName()
    return decodeURIComponent(encodeURIComponent(player.name)) == player_name
  })
  return playerList[0]
})
const tagsForList = computed(() => {
  const tags = player.value?.tags
  return tags
    ? tags
        .reverse()
        .slice((currentPage.value - 1) * perPage.value, currentPage.value * perPage.value)
    : []
})
const totalCount = computed(() => player.value?.tags?.length)

// methods
const resetCurrentPage = () => {
  startLoading()
  currentPage.value = 1
}
const playerName = () => decodeURIComponent(encodeURIComponent(route.params.name))
const changePage = (event, pageNumber) => {
  startLoading()
  router.push('/player/' + encodeURIComponent(playerName()) + '/' + pageNumber)
}
const startLoading = async () => {
  tagsLoaded.value = []
  tagsAreLoading.value = true
  if (perPage.value <= 10) {
    setTimeout(() => {
      tagsAreLoading.value = false
    }, 500)
  }
  playerSocial.value = (await store.getUserSocial(playerName())).data
  playerSocial.value = playerSocial.value.length ? playerSocial.value[0]?.user_metadata?.social : {}
  playerSocial.value?.discord && (playerSocial.value.discord = '')
}
const showModal = () => {
  modal.value = true
  console.log(modal)
}
// const hideModal = () => {
//   modal.value = false
//   console.log(modal)
// }

// watch
watch(
  () => route.params.currentPage,
  (val) => {
    currentPage.value = Number(val)
  }
)

// created
startLoading()

// mounted
onMounted(async () => {
  tagsAreLoading.value = true
  await store.setTags()
  await store.setPlayers()
  tagsAreLoading.value = false
})
</script>

<style lang="scss">
@import '../assets/styles/style';

.trans-bck {
  .modal-content {
    background-color: transparent;
    border: unset;
  }

  @media (min-width: 576px) {
    .modal-dialog {
      max-width: 650px;
    }
  }
}

.player-wrapper {
  .player-bicon {
    width: 100%;

    @media (min-width: $breakpoint-laptop) {
      max-width: 80vw;
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

.social {
  flex-flow: column nowrap;
  width: fit-content;
  margin: 0 auto;

  &__cnt {
    &--left,
    &--rigth {
      margin: 1rem;
    }

    &--left {
      display: inline;

      // width: 30%;
    }

    &--rigth {
      display: inline-flex;
      justify-content: space-between;
      width: 65%;
    }

    &--center {
      width: 100%;
    }
  }

  &__icon {
    cursor: pointer;
    width: 2rem;
  }

  @media (min-width: $breakpoint-laptop) {
    display: grid;
    grid-template-columns: 50px 1fr 50px;
    grid-template-rows: 1fr;

    &__cnt {
      &--left,
      &--center,
      &--rigth {
        grid-row: 1;
      }

      &--left {
        grid-column: 1;
        margin-top: 80px;
        margin-left: 0;
        margin-right: 1rem;
      }

      &--center {
        grid-column: 2;
      }

      &--rigth {
        grid-column: 3;
        flex-flow: column nowrap;
        margin: unset;
        margin-left: 1rem;
        margin-top: 80px;
      }
    }
  }
}
</style>
