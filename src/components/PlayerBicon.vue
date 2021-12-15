<template>
  <div
    v-if="player.name?.length"
    :class="'player-wrapper avatar-' + size + ' p-1 mw-min'"
    role="button"
    @click="goPlayerPage"
  >
    <span class="player-name p-1">{{ playerName }}</span>
    <span v-if="player.tags?.length" class="tag-count p-2">{{ player.tags.length }}</span>
    <img class="player-bicon" :src="playerBiconUrl" :alt="playerName" />
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PlayerBicon',
  props: {
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
    noLink: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    playerName() {
      if (this.size === 'sm') {
        return this.player.name.substr(0, 1)
      } else {
        return this.player.name
      }
    },
    playerBiconUrl() {
      let url
      if (this.player.bicon) {
        url = this.player.bicon
      } else if (this.player.tags[this.player.tags.length - 1].mysteryImageUrl) {
        url = this.player.tags[this.player.tags.length - 1].mysteryImageUrl
      } else {
        url = this.player.tags[this.player.tags.length - 1].foundImageUrl
      }
      return this.getImgurImageSized(url, this.size[0])
    },
  },
  methods: {
    goPlayerPage: function () {
      if (!this.noLink) {
        this.$router.push('/player/' + encodeURIComponent(this.player.name))
      }
    },
    getImgurImageSized(imgurUrl = '', size = 'm') {
      size = size === 't' ? 'm' : size
      return imgurUrl
        .replace('.jpg', `${size}.jpg`)
        .replace('.gif', `${size}.gif`)
        .replace('.png', `${size}.png`)
        .replace('.mp4', `${size}.mp4`)
    },
  },
})
</script>
<style scoped lang="scss">
.player-wrapper {
  position: relative;

  .player-name {
    position: absolute;
    left: 50%;
    z-index: 99;
    text-shadow: 2px 2px 1px #292828e6;
    transform: translate(-50%, 50%) rotate(-15deg);
  }

  .tag-count {
    position: absolute;
    padding: 20px;
    width: 7vh;
    text-align: center;
    clip-path: circle(40%);
    z-index: 99;
  }
}

.avatar-txt {
  .player-name {
    transform: translate(-50%, -100%) rotate(-15deg);
  }

  .tag-count {
    display: none;
    padding: 0;
    width: 1.75em;
    font-size: 0.5em;
  }

  .player-bicon {
    display: none;
  }
}

.avatar-sm {
  .player-bicon {
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
  .player-bicon {
    width: 10rem;
    height: 10rem;
    clip-path: circle(50%);
  }

  .player-name {
    font-size: 4vh;
    bottom: 30%;
    top: auto;
  }

  .tag-count {
    font-size: 3vh;
    top: 43%;
    right: 10px;
  }
}

.avatar-lg {
  .player-bicon {
    border-radius: 5%;
    max-width: 55vh;
  }

  .player-name {
    font-size: 4vh;
    top: 0;
    transform: translateX(-50%);
  }

  .tag-count {
    font-size: 4vh;
    top: 1rem;
    right: 1rem;
  }
}

.player-tags {
  .tag-player {
    display: none;
  }
}

.mw-min {
  max-width: min-content;
}
</style>
