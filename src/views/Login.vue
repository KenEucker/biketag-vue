<template>
  <div class="container">
    <img v-if="isBikeTagAmbassador" :src="bikeTag" />
    <p class="mt-5 mb-5 description">
      {{ isBikeTagAmbassador ? $t('pages.login.ambassador') : $t('pages.login.player') }}
    </p>
    <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTag from '@/assets/images/BikeTag.svg'
import { debug } from '@/common/utils'

export default defineComponent({
  name: 'LoginView',
  components: {
    BikeTagButton,
  },
  data() {
    return {
      bikeTag: BikeTag,
    }
  },
  computed: {
    ...mapGetters(['isBikeTagAmbassador']),
  },
  methods: {
    login() {
      if (this.$auth.loginWithRedirect) {
        this.$auth.loginWithRedirect().then(async () => {
          debugger
          const claims = await this.$auth.getIdTokenClaims()
          if (claims) {
            const token = claims.__raw
            this.$store.dispatch('setProfile', { ...this.$auth.user, token })
          } else {
            debug('what is this? No sprechen sie Deutsch?')
          }
        })
      } else {
        this.$toast.open({
          message: 'cannot login because authentication is not configured',
          type: 'error',
          position: 'top',
        })
      }
    },
  },
})
</script>
<style lang="scss" scoped>
.container {
  img {
    height: 100%;
    max-width: 160px;
  }

  .description {
    background-color: transparent !important;
  }
}
</style>
