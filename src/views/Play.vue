<template>
  <div class="container rel col-lg-6">
    <loading v-if="tagIsLoading" v-model:active="tagIsLoading" class="loader" :is-full-page="true">
      <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
    </loading>
    <div>
      <b-button
        v-if="tagnumber === 0 && !tagIsLoading"
        v-b-popover.click.left="getHint"
        class="btn-hint"
        :title="$t('pages.play.hint').toLocaleUpperCase()"
        variant="primary"
      >
        ?
      </b-button>
      <b-button v-if="getQueuedTags.length" class="btn-clock" @click="goQueue">
        <img class="queue" src="../assets/images/SpinningBikeV1.svg" />
      </b-button>
      <bike-tag
        v-if="tagnumber === 0"
        :tagnumber="getCurrentBikeTag.tagnumber"
        :mystery-image-url="getCurrentBikeTag.mysteryImageUrl"
        :mystery-player="getPlayer(getCurrentBikeTag.mysteryPlayer)"
        :player="getCurrentBikeTag.mysteryPlayer"
        size="l"
        :mystery-description="$t('pages.play.mystery').toLocaleUpperCase()"
      />
      <bike-tag v-else :tag="tag" size="l" @load="tagLoaded" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'

export default defineComponent({
  name: 'PlayView',
  components: {
    BikeTag,
    Loading,
  },
  data() {
    return {
      tagnumber: this.$route.params?.tagnumber?.length ? parseInt(this.$route.params.tagnumber) : 0,
      tagIsLoading: false,
    }
  },
  computed: {
    ...mapGetters([
      'getCurrentBikeTag',
      'getCurrentHint',
      'getTags',
      'getPlayers',
      'getQueuedTags',
    ]),
    tag() {
      if (this.tagnumber !== 0) {
        const tag = this.getTags?.filter((t) => t.tagnumber === this.tagnumber)
        return tag && tag.length ? tag[0] : {}
      }
      return undefined
    },
    getHint() {
      return this.getCurrentBikeTag.hint ?? this.$t('pages.play.nohint')
    },
  },
  async created() {
    this.tagIsLoading = true
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    this.tagIsLoading = false
  },
  methods: {
    hint() {
      alert(this.getCurrentBikeTag.hint)
    },
    tagLoaded() {
      this.tagIsLoading = false
    },
    async goQueue() {
      await this.$store.dispatch('resetFormStep')
      this.$router.push('/queue')
    },
    getPlayer(playerName) {
      const playerList =
        this.getPlayers?.filter((player) => {
          return decodeURIComponent(encodeURIComponent(player.name)) == playerName
        }) ?? []
      return playerList[0]
    },
  },
})
</script>
<style scoped lang="scss">
.rel {
  position: relative;
}

.container {
  min-height: 350px;
  background-color: transparent;
}

.btn-hint {
  position: absolute;
  top: 10px;
  left: 20px;
  z-index: 99;
  font-size: 1.25em;
}

.btn-clock {
  position: absolute;
  top: -15px;
  right: -25px;
  z-index: 99;
  font-size: 1.25em;
  background-color: transparent !important;
  border-color: transparent !important;

  i {
    color: forestgreen;
    cursor: pointer;
    font-size: 4.5vh;
  }

  .queue {
    max-height: 3.5em;
    animation: tronFilter 5s ease-in-out infinite alternate;
  }
}
</style>
