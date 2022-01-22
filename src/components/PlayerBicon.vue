<template>
  <div
    v-if="player.name?.length"
    :class="'player-wrapper avatar-' + size"
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
import { mapGetters } from 'vuex'

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
    ...mapGetters(['getImgurImageSized']),
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
  },
})
</script>
<style scoped lang="scss">
.player-wrapper {
  position: relative;
  padding-top: 2rem;

  .player-name {
    z-index: 99;
    text-shadow: 3px -2px 3px #292828e6;
    filter: invert(1) drop-shadow(2px 4px 6px white);
    transform: rotate(-8deg);
    display: block;
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
    bottom: 0;
    right: -22%;
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
    max-width: 90vw;
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
</style>
