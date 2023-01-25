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
import { computed } from 'vue'
import { useStore } from '@/store/index.ts'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTag from '@/assets/images/BikeTag.svg'
import { debug } from '@/common/utils'

export default {
  name: 'LoginView',
  components: {
    BikeTagButton,
  },
  setup() {
    const bikeTag = BikeTag
    const store = useStore()

    // computed
    const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)

    // methods
    function login() {
      if (this.$auth.loginWithRedirect) {
        this.$auth.loginWithRedirect().then(async () => {
          debugger
          const claims = await this.$auth.getIdTokenClaims()
          if (claims) {
            const token = claims.__raw
            store.setProfile({ ...this.$auth.user, token })
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
    }

    return {
      bikeTag,
      isBikeTagAmbassador,
      login,
    }
  },
}
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
