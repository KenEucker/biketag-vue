<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container mt-5">
    <div class="d-flex justify-content-center social">
      <player size="lg" :player="player" :no-link="true" />
      <div v-if="playerSocial" class="social__cnt">
        <a
          v-for="(social, i) in Object.keys(playerSocial).filter((s) => s.length)"
          :key="i"
          :href="`${socialLinks[social]}${playerSocial[social]}`"
        >
          <img :id="social" class="social__icon" :src="socialNetworkIcons[social]" />
          <span> {{ playerSocial[social] }}</span>
        </a>
      </div>
    </div>
    <div>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalCount"
        :per-page="perPage"
        aria-controls="itemList"
        align="center"
        @page-click="changePage"
      ></b-pagination>
      <div class="m-auto player-tags">
        <div v-for="tag in tagsForList" :key="tag?.tagnumber">
          <bike-tag
            :key="tag?.tagnumber"
            :tag="tag"
            :show-player="false"
            :found-tagnumber="tag?.tagnumber - 1"
            :found-description="tag?.foundLocation"
          />
        </div>
      </div>
      <b-form-group>
        <select v-model="perPage" class="m-auto form-select w-25" @change="resetCurrentPage">
          <option v-for="i in 3" :key="Math.pow(10, i)" :value="Math.pow(10, i)">
            {{ Math.pow(10, i) }}
          </option>
        </select>
      </b-form-group>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalCount"
        :per-page="perPage"
        aria-controls="itemList"
        align="center"
        @page-click="changePage"
      ></b-pagination>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import biketag from 'biketag'
import Player from '@/components/PlayerBicon.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import Reddit from '@/assets/images/Reddit.svg'
import Instagram from '@/assets/images/Instagram.svg'
import Twitter from '@/assets/images/Twitter.svg'
import Imgur from '@/assets/images/Imgur.svg'
import Discord from '@/assets/images/Discord.svg'

export default defineComponent({
  name: 'PlayerView',
  components: {
    BikeTag,
    Loading,
    Player,
  },
  data() {
    return {
      currentPage: this.$route.params?.currentPage.length
        ? parseInt(this.$route.params?.currentPage)
        : 1,
      perPage: 10,
      tagsAreLoading: true,
      tagsLoaded: [],
      playerSocial: null,
      socialNetworkIcons: {
        reddit: Reddit,
        instagram: Instagram,
        twitter: Twitter,
        imgur: Imgur,
        discord: Discord,
      },
      socialLinks: {
        imgur: 'http://imgur.com/user/',
        instagram: 'http://instagram.com/',
        twitter: 'http://twitter.com/',
        reddit: 'http://reddit.com/u/',
        discord: '',
      },
    }
  },
  computed: {
    // mix the getters into computed with object spread operator
    ...mapGetters(['getPlayers']),
    player() {
      const playerList = this.getPlayers?.filter((player) => {
        const playerName = this.playerName()
        return decodeURIComponent(encodeURIComponent(player.name)) == playerName
      })
      const player = playerList[0]
      return player
    },
    tagsForList() {
      const tags = this.player?.tags
      return tags
        ? tags
            .reverse()
            .slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage)
        : []
    },
    totalCount() {
      return this.player?.tags?.length
    },
  },
  watch: {
    '$route.params.currentPage': function (val) {
      this.currentPage = Number(val)
    },
  },
  created() {
    this.startLoading()
  },
  async mounted() {
    this.tagsAreLoading = true
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
    this.tagsAreLoading = false
  },
  methods: {
    resetCurrentPage() {
      this.startLoading()
      this.currentPage = 1
    },
    playerName() {
      return decodeURIComponent(encodeURIComponent(this.$route.params.name))
    },
    getSelfTagFoundDescription(tag) {
      return biketag.getters.getImgurFoundDescriptionFromBikeTagData({
        ...tag,
        ...{ tagnumber: tag.tagnumber - 1 },
      })
    },
    changePage(event, pageNumber) {
      this.startLoading()
      this.$router.push('/player/' + encodeURIComponent(this.playerName()) + '/' + pageNumber)
    },
    async startLoading() {
      this.tagsLoaded = []
      this.tagsAreLoading = true
      if (this.perPage <= 10) {
        setTimeout(() => {
          this.tagsAreLoading = false
        }, 500)
      }
      this.playerSocial = (await this.$store.dispatch('getUserSocial', this.playerName())).data
      this.playerSocial = this.playerSocial.length ? this.playerSocial[0] : {}
      this.playerSocial?.discord && (this.playerSocial.discord = '')
    },
  },
})
</script>
<style lang="scss">
@media (min-width: 576px) and (max-width: 740px) {
  .avatar-lg .player-bicon {
    max-width: 80vw !important;
  }
}
</style>
<style lang="scss" scoped>
.social {
  flex-flow: column nowrap;

  &__cnt {
    justify-content: space-evenly;
    display: flex;
    margin: 1rem;
  }

  &__icon {
    cursor: pointer;
    max-width: 2rem;
  }
  @media (min-width: 576px) {
    flex-flow: row nowrap;

    &__cnt {
      flex-flow: column nowrap;
      margin: unset;
      margin-left: 1rem;
      margin-top: 80px;
    }
  }
}
</style>
