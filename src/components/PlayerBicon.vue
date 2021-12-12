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
      return url
    },
  },
  methods: {
    goPlayerPage: function () {
      this.$router.push('/player/' + encodeURIComponent(this.player.name))
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
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 0.5rem;
    text-shadow: 2px 2px #292828e6;
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

.avatar-lg {
  .player-bicon {
    border-radius: 5%;
    max-width: 50vh;
  }

  .player-name {
    font-size: 4vh;
    bottom: 1rem;
    top: auto;
  }

  .tag-count {
    font-size: 4vh;
    top: 1rem;
    right: 1rem;
  }
}

.avatar-md {
  .player-bicon {
    width: 300px;
    height: 300px;
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

.avatar-sm {
  .player-bicon {
    width: 200px;
    height: 200px;
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

.mw-min {
  max-width: min-content;
}
</style>
