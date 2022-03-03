<template>
  <div class="container">
    <img v-if="isBikeTagAmbassador" :src="bikeTag" />
    <p class="description mt-5 mb-5">
      {{ isBikeTagAmbassador ? $t('login.ambassador') : $t('login.user') }}
    </p>
    <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
    <netlify-identity-widget />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import NetlifyIdentityWidget from '@/components/NetlifyIdentityWidget.vue'
import BikeTag from '@/assets/images/BikeTag.svg'
import netlifyIdentity from 'netlify-identity-widget'
export default defineComponent({
  name: 'LoginView',
  components: {
    BikeTagButton,
    NetlifyIdentityWidget,
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
      // if (this.isBikeTagAmbassador) {
      //   console.log({ u: netlifyIdentity.currentUser() })
      //   netlifyIdentity.open('login')
      // } else
      if (this.$auth.loginWithRedirect) {
        this.$auth.loginWithRedirect().then(async () => {
          const token = (await this.$auth.getIdTokenClaims()).__raw
          this.$store.dispatch('setUser', { ...this.$auth.user, token })
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
