<template>
  <div
    v-if="_playerName?.length"
    :class="`player-bicon avatar-${props.size} my-5 `"
    role="button"
    @click="goPlayerPage"
  >
    <span v-if="props.size === 'lg'" class="player-name p-1">{{ _playerName }}</span>
    <div class="player-bicon__count">
      <svg class="svg">
        <clipPath id="badge-clip" clipPathUnits="objectBoundingBox">
          <path
            d="M0,0.051 v0.572 c0,0.025,0.019,0.064,0.05,0.083 l0.404,0.28 c0.025,0.019,0.068,0.019,0.093,0 l0.404,-0.28 c0.025,-0.019,0.05,-0.057,0.05,-0.083 v-0.572 C0.994,0.019,0.963,0,0.925,0 H0.068 C0.031,0,0,0.019,0,0.051 L0,0.051"
          ></path>
        </clipPath>
      </svg>
      <div class="clipped"></div>
      <span
        v-if="props.player?.tags?.length"
        :class="`tag-count tag-count--color-${tagColorNumber(props.player.tags.length)}`"
        >{{ getTagCount }}</span
      >
      <img
        v-if="playerBiconUrl"
        class="player-bicon__image"
        :src="playerBiconUrl"
        :alt="_playerName"
      />
    </div>
    <span v-if="props.size !== 'lg'" class="player-name p-1">{{ _playerName }}</span>
  </div>
</template>

<script setup name="BikeTagPlayer">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '../store/index'

// props
const props = defineProps({
  size: {
    type: String,
    default: 'md',
  },
  player: {
    type: Object,
    default: () => {
      return {}
    },
  },
  playerName: {
    type: String,
    default: null,
  },
  noLink: {
    type: Boolean,
    default: false,
  },
})

// data
const store = useBikeTagStore()
const router = useRouter()

// computed
const getImgurImageSized = computed(() => store.getImgurImageSized)
const _playerName = computed(() => {
  if (props.playerName) {
    return props.playerName
  }
  if (props.size === 'sm') {
    return props.player?.name.substr(0, 1)
  } else {
    return props.player?.name
  }
})
const playerBiconUrl = computed(() => {
  let url
  if (props.player && typeof props.player === 'object') {
    if (props.player.bicon) {
      url = props.player.bicon
    } else if (props.player.tags[props.player.tags.length - 1]?.mysteryImageUrl) {
      url = props.player.tags[props.player.tags.length - 1].mysteryImageUrl
    } else {
      url = props.player.tags[props.player.tags.length - 1]?.foundImageUrl
    }
  }
  return getImgurImageSized.value(url, props.size[0])
})
const getTagCount = computed(() => {
  if (props.size === 'lg') {
    return props.player.tags.length
  }
  return props.player.tags.length > 99 ? '+99' : props.player.tags.length
})

// methods
function goPlayerPage() {
  if (!props.noLink) {
    router.push('/player/' + encodeURIComponent(props.player?.name))
  }
}
function tagColorNumber(count) {
  if (count === 1) {
    return 'one'
  } else if (count < 10) {
    return 'lessthanten'
  } else if (count > 49 && count < 100) {
    return 'fiftyormore'
  } else if (count > 100 && count < 500) {
    return 'onehundredormore'
  } else {
    return 'fivehundredormore'
  }
}
</script>

<style scoped lang="scss">
@import '../assets/styles/style';

.player-bicon {
  position: relative;
  padding-top: 2rem;

  &__count {
    position: relative;
  }

  .player-name {
    z-index: 99;
    transform: rotate(-8deg);
    display: block;
    animation: fadein 2s;
    word-break: break-all;
    font-family: $default-secondary-font-family;
    white-space: nowrap;

    // word-break: break-word;
    // text-decoration-line: underline;
  }

  .svg {
    position: absolute;
    width: 0;
    height: 0;
  }

  .tag-count {
    position: absolute;
    padding: 10px 0;
    min-width: 4rem;
    text-align: center;
    clip-path: url('#badge-clip');
    z-index: 99;
  }

  .tag-count--color-one {
    background-color: rgb(228 178 13 / 90%);
  }

  .tag-count--color-lessthanten {
    background-color: rgb(26 228 13 / 90%);
  }

  .tag-count--color-fiftyormore {
    background-color: rgb(31 13 228 / 90%);
  }

  .tag-count--color-onehundredormore {
    background-color: rgb(228 13 219 / 90%);
  }

  .tag-count--color-fivehundredormore {
    background-color: rgb(228 13 31 / 87%);
  }
}

.avatar-txt {
  .tag-count {
    display: none;
    padding: 0;
    width: 1.75em;
    font-size: 0.5em;
  }

  .player-bicon__image {
    display: none;
  }
}

.avatar-sm {
  .player-bicon__image {
    width: 8rem;
    height: 8rem;
    clip-path: circle(50%);
  }

  .player-name {
    font-size: 3.5vh;
    bottom: 1rem;
    top: auto;
  }

  .tag-count {
    font-size: 2.5vh;
    top: 43%;
    right: 5px;
  }
}

.avatar-md {
  .player-bicon__image {
    width: 10rem;
    height: 10rem;
    clip-path: circle(50%);
  }

  .player-name {
    font-size: $default-font-size;
    bottom: 0;
    right: -22%;
    top: auto;
  }

  .tag-count {
    font-size: $default-font-size;
    width: 3.5rem;
    left: 55%;
    top: 15%;
  }

  @media (width >= 1024px) {
    .tag-count {
      left: 52%;
    }
  }
}

.avatar-lg {
  .player-bicon__image {
    width: 100%;
    max-width: 85vw;
    border-radius: 5%;
  }

  .player-name {
    transform: unset;
    max-width: 50vw;
    font-size: 2.5rem !important;
    margin-bottom: 5%;
  }

  .tag-count {
    font-size: 2rem;
    right: 0;
    padding: 2px 8px;
  }

  @media (width >= 1024px) {
    .player-name {
      font-size: 5rem !important;
    }
  }
}

.player-tags {
  .tag-player {
    display: none;
  }
}
</style>
