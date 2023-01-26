<template>
  <div>
    <!-- Button Group -->
    <div class="button-group">
      <!-- Left Button -->
      <bike-tag-button
        class="button-group__left"
        :text="$t('menu.biketags')"
        @click="goBikeTagsPage"
      />
      <!-- Middle Button -->
      <bike-tag-button
        class="button-group__middle"
        variant="bold"
        :text="$t('menu.play')"
        @click="goPlayPage"
      />
      <!-- Right Button -->
      <bike-tag-button class="button-group__right" :text="$t('menu.howto')" @click="goHowPage" />
    </div>
    <span
      v-if="getEasterEgg && playingEaster"
      class="fas fa-volume-mute"
      @click="muteEasterEgg"
    ></span>
    <audio id="biketag-jingle" ref="jingle">
      <source id="audioSource" :autoplay="playingEaster" type="audio/mpeg" :src="getEasterEgg" />
      {{ $t('pages.howto.browser_not_support_audio') }}
    </audio>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from '@/store/index.ts'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default {
  name: 'BikeTagHeader',
  components: {
    BikeTagButton,
  },
  setup() {
    const jingle = ref(null)
    const playingEaster = ref(false)
    const store = useStore()

    // computed
    const getEasterEgg = computed(() => store.getEasterEgg)

    // methods
    function muteEasterEgg(e) {
      e.preventDefault()
      e.stopPropagation()
      if (playingEaster.value) {
        document.getElementById('jingle').pause()
        playingEaster.value = false
      }
    }
    function goBikeTagsPage() {
      this.$router.push('/biketags')
    }
    function goPlayPage() {
      this.$router.push('/play')
    }
    function goHowPage() {
      this.$router.push('/howtoplay')
    }

    return {
      jingle,
      playingEaster,
      getEasterEgg,
      muteEasterEgg,
      goBikeTagsPage,
      goPlayPage,
      goHowPage,
    }
  },
}
</script>
<style lang="scss" scoped>
.button-group {
  display: flex;
  align-items: center;
  justify-content: center;

  // &__left {
  // }

  &__middle {
    margin-left: 0.5rem;
  }

  &__right {
    margin-left: 0.5rem;
  }
}
</style>
