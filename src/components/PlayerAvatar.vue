<template>
  <div class="p-1" role="button" @click="goPlayerPage">
    <img class="player-bicon" :src="playerAvatarUrl" :alt="playerName" />
    <div>
      <span v-if="!!playerPos" class="p-1">#{{ playerPos }}</span>
      <span class="p-1">{{ playerName }}</span>
      <span v-if="tagCount" class="p-1">({{ tagCount }})</span>
    </div>
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
span {
  font-size: 4vh;
}

.player-bicon {
  border-radius: 5%;
  max-width: 50vh;
}
</style>
