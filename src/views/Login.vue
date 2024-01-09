<!-- eslint-disable vue/multi-word-component-names -->
<script setup name="LoginView">
import { inject, computed } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { isAuthenticationEnabled } from '@/common/utils'
import { useAuth0 } from '@auth0/auth0-vue'
import BikeTagSvg from '@/assets/images/BikeTag.svg'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'

// data
const store = useBikeTagStore()
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const toast = inject('toast')
const { isAuthenticated, loginWithRedirect, idTokenClaims, user } = useAuth0()

// computed
const { t } = useI18n()

// methods
async function login() {
  if (!isAuthenticationEnabled()) {
    toast.open({
      message: 'cannot login because authentication is not configured',
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }

  if (!isAuthenticated.value) {
    await loginWithRedirect().then(async () => {
      if (isAuthenticated.value && idTokenClaims.value) {
        await store.setProfile({ ...user.value, token: idTokenClaims.value._raw })
      }
    })
  }
}
</script>
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="isAuthenticationEnabled()" class="container">
    <img v-if="isBikeTagAmbassador" :src="BikeTagSvg" alt="BikeTag Ambassador" />
    <p class="mt-5 mb-5 description">
      {{ $t('pages.login.description') }}
    </p>
    <p class="mt-5 mb-5 welcome">
      {{ isBikeTagAmbassador ? $t('pages.login.ambassador') : $t('pages.login.player') }}
    </p>
    <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
  </div>
  <div v-else class="container">
    <p class="mt-5 mb-5 description">
      {{ $t('pages.login.disabled') }}
    </p>
  </div>
</template>

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
    font-size: $default-font-size;
    text-transform: uppercase;
  }

  .welcome {
    font-family: $default-font-family;
  }
}
</style>
