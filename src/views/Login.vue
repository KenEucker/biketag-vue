<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container">
    <img v-if="isBikeTagAmbassador" :src="bikeTag" alt="BikeTag Ambassador" />
    <p class="mt-5 mb-5 description">
      {{ $t('pages.login.description') }}
    </p>
    <p class="mt-5 mb-5 welcome">
      {{ isBikeTagAmbassador ? $t('pages.login.ambassador') : $t('pages.login.player') }}
    </p>
    <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
  </div>
</template>

<script setup name="LoginView">
import { inject, computed } from 'vue'
import { useStore } from '@/store/index.ts'
import { useAuth0 } from '@auth0/auth0-vue'
import BikeTag from '@/assets/images/BikeTag.svg'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'

// data
const bikeTag = BikeTag
const store = useStore()
const { isAuthenticated, loginWithRedirect, idTokenClaims, user } = useAuth0()
const toast = inject('toast')

// computed
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const { t } = useI18n()

// methods
async function login() {
  if (!isAuthenticated.value) {
    toast.open({
      message: 'cannot login because authentication is not configured',
      type: 'error',
      position: 'top',
    })
    await loginWithRedirect()
    if (isAuthenticated.value && idTokenClaims.value) {
      store.setProfile({ ...user.value, token: idTokenClaims.value._raw })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.container {
  img {
    height: 100%;
    max-width: 160px;
  }

  .description {
    background-color: transparent !important;
    font-family: $default-font-family;
    text-transform: uppercase;
  }

  .welcome {
    font-family: $default-font-family;
  }
}
</style>
