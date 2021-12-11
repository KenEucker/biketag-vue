<template>
  <div :class="'player-wrapper avatar-' + size + ' p-1 mw-min'" role="button" @click="goPlayerPage">
    <span class="player-name p-1">{{ playerName }}</span>
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
      default: 'lg',
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
    -webkit-transform: translateX(-50%);
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
    bottom: 1rem;
    top: auto;
  }
  .tag-count {
    top: 1rem;
    right: 1rem;
  }
}

.avatar-md {
  .player-bicon {
    clip-path: circle(40%);
    max-width: 50vh;
  }
  .player-name {
    bottom: 30%;
    top: auto;
  }
  .tag-count {
    top: 45%;
    right: 4rem;
  }
}

.avatar-sm {
  .player-bicon {
    border-radius: 5%;
    max-width: 50vh;
  }
}

span {
  font-size: 4vh;
}

.mw-min {
  max-width: min-content;
}
</style>
