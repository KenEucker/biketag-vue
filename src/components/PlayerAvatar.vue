<template>
  <div :class="'player-wrapper avatar-' + size + ' p-1 mw-min'" role="button" @click="goPlayerPage">
    <span class="player-name p-1">{{ _playerName }}</span>
    <span v-if="tagCount" class="tag-count p-2">{{ tagCount }}</span>
    <img class="player-bicon" :src="playerAvatarUrl" :alt="playerName" />
    <!-- <span v-if="!!playerPos" class="p-1">Top{{ playerPos }}</span> -->
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PlayerAvatar',
  props: {
    size: {
      type: String,
      default: 'md',
    },
    playerPos: {
      type: Number,
      default: 0,
    },
    playerName: {
      type: String,
      default: '',
    },
    tagCount: {
      type: Number,
      default: 0,
    },
    playerAvatarUrl: {
      type: String,
      default: '',
    },
  },
  computed: {
    _playerName() {
      if (this.size === 'sm') {
        return this.playerName.substr(0, 1)
      } else {
        return this.playerName
      }
    },
  },
  methods: {
    goPlayerPage: function () {
      this.$router.push('/player/' + encodeURIComponent(this.playerName))
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
