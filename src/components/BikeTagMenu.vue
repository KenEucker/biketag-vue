<template>
  <div v-if="variant === 'top'">
    <!-- The header logo and profile and hamburger buttons go here -->
    <header class="biketag-header">
      <div class="biketag-header-nav">
        <img src="/public/images/Profile.svg" alt="Profile con" />
        <a href="./">
          <img :src="getLogoUrl('h=256&w=256')" class="logo img-fluid" />
        </a>
        <img src="/public/images/Hamburger.svg" alt="Burge menu" />
      </div>
      <span class="game-title">{{ getGameTitle }}</span>
    </header>
  </div>
  <div v-if="variant === 'bottom'">
    <!-- The footer nav buttons and link to homepage go here -->
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import { GetQueryString } from '@/common/utils'

export default defineComponent({
  name: 'BikeTagMenu',
  props: {
    logo: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: 'top',
    },
  },
  computed: {
    ...mapGetters(['getGameTitle', 'getLogoUrl', 'getCurrentBikeTag']),
  },
  async created() {
    const btaId = GetQueryString(window, 'btaId')
    const expiry = GetQueryString(window, 'expiry')
    if (btaId && expiry) {
      this.$store.dispatch('setFormStepToApprove')
      this.$router.push('/play')
    }
    await this.$store.dispatch('setGame')
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setCurrentBikeTag')
    await this.$store.dispatch('setQueuedTags')
    await this.$store.dispatch('setPlayers')
    this.checkForNewBikeTagPost()
  },
  mounted() {
    this.checkForNewBikeTagPost()
  },
  methods: {
    checkForNewBikeTagPost() {
      if (
        this.getCurrentBikeTag.tagnumber > this.getMostRecentlyViewedTagnumber &&
        this.getMostRecentlyViewedTagnumber !== 0
      ) {
        console.log('ui::new biketag posted!!')
        this.$toast.open({
          message: `Round #${this.getCurrentBikeTag.tagnumber} of BikeTag ${this.getGameName} has been posted!`,
          type: 'default',
          position: 'top',
        })
      }
    },
  },
})
</script>
<style lang="scss" scoped></style>
