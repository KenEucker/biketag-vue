<template>
  <div class="container">
    <img v-if="isBikeTagAmbassador" :src="bikeTag" />
    <p class="description mt-5 mb-5">
      {{ isBikeTagAmbassador ? $t('login.ambassador') : $t('login.user') }}
    </p>
    <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTag from '@/assets/images/BikeTag.svg'
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
