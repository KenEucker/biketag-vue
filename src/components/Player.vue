<template>
  <div class="p-1" role="button" @click="goProfilePage">
    <img class="player-bicon" :src="playerAvatarUrl" :alt="playerName" />
    <div>
      <span v-if="playerPos" class="p-1">#{{ playerPos }}</span>
      <span class="p-1">{{ playerName }}</span>
      <span v-if="tagCount" class="p-1">({{ tagCount }})</span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'PlayerComp',
  props: {
    playerPos: {
      type: String,
      default: '',
    },
    playerName: {
      type: String,
      default: '',
    },
    tagCount: {
      type: String,
      default: '',
    },
    playerAvatarUrl: {
      type: String,
      default: '',
    },
  },
  methods: {
    goProfilePage: function () {
      this.$router.push('/players/' + encodeURIComponent(this.playerName))
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
