<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <b-modal
    v-if="player && bikedex?.length"
    v-model="modal"
    title="BikeDex"
    hide-footer
    hide-header
    modal-class="bikedex-modal"
  >
    <div class="container mt-5">
      <bike-dex :tags="bikedex" />
    </div>
  </b-modal>
  <div v-if="player" class="container biketag-player">
    <div class="mb-2 social">
      <div class="mt-5 mr-2" @click="showBikeDex">
        <img
          v-if="bikedex?.length"
          class="bikedex-icon"
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0iYmkgYmktYm9vdHN0cmFwLXJlYm9vdCIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNMS4xNjEgOGE2Ljg0IDYuODQgMCAxIDAgNi44NDItNi44NC41OC41OCAwIDEgMSAwLTEuMTYgOCA4IDAgMSAxLTYuNTU2IDMuNDEybC0uNjYzLS41NzdhLjU4LjU4IDAgMCAxIC4yMjctLjk5N2wyLjUyLS42OWEuNTguNTggMCAwIDEgLjcyOC42MzNsLS4zMzIgMi41OTJhLjU4LjU4IDAgMCAxLS45NTYuMzY0bC0uNjQzLS41NkE2LjgxMiA2LjgxMiAwIDAgMCAxLjE2IDh6Ii8+CiAgPHBhdGggZD0iTTYuNjQxIDExLjY3MVY4Ljg0M2gxLjU3bDEuNDk4IDIuODI4aDEuMzE0TDkuMzc3IDguNjY1Yy44OTctLjMgMS40MjctMS4xMDYgMS40MjctMi4xIDAtMS4zNy0uOTQzLTIuMjQ2LTIuNDU2LTIuMjQ2SDUuNXY3LjM1MmgxLjE0MXptMC0zLjc1VjUuMjc3aDEuNTdjLjg4MSAwIDEuNDE2LjQ5OSAxLjQxNiAxLjMyIDAgLjg0LS41MDQgMS4zMjQtMS4zODYgMS4zMjRoLTEuNnoiLz4KPC9zdmc+"
        />
      </div>
      <player-bicon class="social__cnt--center" size="lg" :player="player" :no-link="true" />
      <div v-if="achievements?.length" class="achievements">
        <h3>Achievements</h3>
        <div v-for="achievement in achievements" :key="achievement.key" class="achievement">
          <bike-tag-achievement :achievement="achievement" />
        </div>
      </div>
      <div v-if="Object.keys(playerSocial ?? {}).length" class="social__cnt--rigth">
        <a
          v-for="(social, i) in Object.keys(playerSocial).filter((s) => s.length)"
          :key="i"
          :href="`${socialLinks[social]}${playerSocial[social]}`"
        >
          <img
            :id="social"
            class="social__icon"
            :src="socialNetworkIcons[social]"
            :alt="socialNetworkIcons[social]"
          />
        </a>
      </div>
    </div>
    <Searchable
      item-type="player"
      :items="player?.tags?.toReversed()"
      :search-algo="playerTagSearch"
      main-route="Player"
      search-route="Player Tag Search"
    >
      <template #content="{ displayedItems }">
        <div class="small-margin player-tags">
          <div v-for="tag in displayedItems" :key="tag?.tagnumber">
            <bike-tag
              :key="tag?.tagnumber"
              :tag="tag"
              :show-player="false"
              :found-tagnumber="tag?.tagnumber - 1"
              :found-description="tag?.foundLocation"
            />
          </div>
        </div>
      </template>
    </Searchable>
  </div>
</template>

<script setup name="PlayerView">
import Bluesky from '@/assets/images/Bluesky.svg'
import Discord from '@/assets/images/Discord.svg'
import Imgur from '@/assets/images/Imgur.svg'
import Instagram from '@/assets/images/Instagram.svg'
import Reddit from '@/assets/images/Reddit.svg'
import { useBikeTagStore } from '@/store'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

// components
import BikeDex from '@/components/BikeDex.vue'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagAchievement from '@/components/BikeTagAchievement.vue'
import PlayerBicon from '@/components/BikeTagPlayer.vue'
import Searchable from '@/components/Searchable.vue'

// data
const route = useRoute()
const playerSocial = ref(null)
const socialNetworkIcons = {
  reddit: Reddit,
  instagram: Instagram,
  bluesky: Bluesky,
  imgur: Imgur,
  discord: Discord,
}
const socialLinks = {
  imgur: 'https://imgur.com/user/',
  instagram: 'https://instagram.com/',
  bluesky: 'https://bsky.app/',
  reddit: 'https://reddit.com/u/',
  discord: '',
}
const store = useBikeTagStore()
const modal = ref(false)
const playerName = ref(decodeURIComponent(encodeURIComponent(route.params.name)))
const player = computed(() => store.getPlayers.find((p) => p.name === playerName.value))

// computed
const bikedex = computed(() => [])
const achievements = computed(() => player.value?.achievements?.map(store.getBikeTagAchievement))

// methods
const showBikeDex = () => {
  modal.value = true
}
// const hideModal = () => {
//   modal.value = false
//   console.log(modal)
// }
const playerTagSearch = (tags, searchString) => {
  const query = searchString.toLowerCase()

  const searchedNumber = parseInt(query.match(/^#?(\d+)$/)?.[1])
  const foundByNumber = []

  const splitQuery = query.split(/\s+/)
  const tagToScore = new Map()
  for (const tag of tags) {
    if (
      searchedNumber &&
      !foundByNumber.length &&
      [searchedNumber, searchedNumber + 1].includes(tag.tagnumber)
    ) {
      foundByNumber[0] = tag
      continue
    }

    const stringToMatch = tag.hint?.toLowerCase() + tag.foundLocation?.toLowerCase()
    let score = 0
    if (stringToMatch.includes(query)) {
      score++
    }
    for (const word of splitQuery) {
      if (stringToMatch.includes(word)) {
        score++
      }
    }
    tagToScore.set(tag, score)
  }

  const sortedResults = tags
    .filter((tag) => tagToScore.get(tag) > 0)
    .toSorted((a, b) => tagToScore.get(a) - tagToScore.get(b))
  return foundByNumber.concat(sortedResults)
}

// mounted
onMounted(async () => {
  await store.isReady()
  store.fetchAllAchievements()
  await store.fetchPlayers() // ensure the players are set before fetching THIS player's additional profile info
  store.fetchPlayerProfile(playerName.value)
})
</script>

<style lang="scss">
@import '../assets/styles/style';

.bikedex-modal {
  .modal-content {
    background-color: transparent;
    border: unset;
  }

  @media (width >= 576px) {
    .modal-dialog {
      max-width: 650px;
    }
  }
}

.player-bicon {
  // right: 2rem;

  .player-bicon {
    width: 100%;

    @media (min-width: $breakpoint-laptop) {
      max-width: 80vw;
    }
  }
}

@media (width <= 767px) {
  .social {
    flex-wrap: wrap;
  }

  // .player-bicon {
  //   margin: auto;
  // }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

.achievements {
  margin-left: 5%;

  h3 {
    margin-top: auto;
  }
}

.achievement {
  overflow-x: scroll;
  display: inline-flex;
}

.bikedex-icon {
  cursor: pointer;
  width: 2rem;
  margin-right: 1rem;
}

.social {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;

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
  }

  &__icon {
    cursor: pointer;
    width: 2rem;
    margin-right: 1rem;
  }

  @media (min-width: $breakpoint-laptop) {
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
