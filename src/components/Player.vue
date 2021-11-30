<template>
  <div class="p-1" role="button" @click="goProfilePage">
    <div>
      <span v-if="playerPos" class="p-1">#{{ playerPos }}</span>
      <span class="p-1">{{ playerName }}</span>
      <span v-if="tagCount" class="p-1">({{ tagCount }})</span>
    </div>
    <img :src="playerAvatarUrl" :alt="playerName" />
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
<style scoped>
span {
  font-size: 4vh;
}
</style>
