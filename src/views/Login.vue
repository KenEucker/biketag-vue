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
import netlifyIdentity from 'netlify-identity-widget'
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
      if (this.isBikeTagAmbassador) {
        netlifyIdentity.open('login')
      } else {
        this.$auth.loginWithRedirect().then(() => {
          this.$store.dispatch('setUser', this.$auth.user)
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
