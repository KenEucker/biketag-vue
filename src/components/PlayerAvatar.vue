<template>
  <div class="player-wrapper p-1 mw-min" role="button" @click="goPlayerPage">
    <span class="player-name p-1">{{ playerName }}</span>
    <span v-if="tagCount" class="tag-count p-1">({{ tagCount }})</span>
    <img class="player-bicon" :src="playerAvatarUrl" :alt="playerName" />
    <!-- <span v-if="!!playerPos" class="p-1">Top{{ playerPos }}</span> -->
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PlayerAvatar',
  props: {
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
    bottom: 1rem;
    top: auto;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 0.5rem;
    text-shadow: 2px 2px #292828e6;

    /* border-radius: 10px; */
  }

  .tag-count {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 99;
    text-shadow: 2px 2px #292828e6;
  }
}
span {
  font-size: 4vh;
}
.player-bicon {
  border-radius: 5%;
  max-width: 50vh;
}
.mw-min {
  max-width: min-content;
}
</style>
