<template>
  <div v-if="isAuthenticationEnabled()" class="container">
    <div class="login-benefits">
      <section class="hero">
        <h1>BikeTag</h1>
        <p>Be part of the adventure.<br />Join the BikeTag community and unlock player features.</p>
        <img v-if="isBikeTagAmbassador" :src="BikeTagSvg" alt="BikeTag Ambassador" />
        <bike-tag-button variant="bold" :text="$t('menu.login')" @click="login" />
      </section>

      <section class="benefit">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87M16 3.13a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
          </svg>
        </div>
        <div>
          <h2>Your Player Profile</h2>
          <p>Choose your name, upload a photo, and represent yourself in every game.</p>
        </div>
      </section>

      <section class="benefit">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M8 21h8M12 17v4"></path>
          </svg>
        </div>
        <div>
          <h2>Finish from Any Device</h2>
          <p>Start a post on your ride, finish it later at home — your login keeps you synced.</p>
        </div>
      </section>

      <section class="benefit">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div>
          <h2>Reserve Your Name</h2>
          <p>Lock in your player name with a passcode, so it’s yours forever.</p>
        </div>
      </section>

      <section class="benefit">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 21l4-2 4 2v-5l4-4-5-.75L12 5 9 11.25 4 12l4 4z"></path>
          </svg>
        </div>
        <div>
          <h2>Achievements & Notifications</h2>
          <p>Earn awards and stay informed when the game advances.</p>
        </div>
      </section>

      <section class="benefit">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3l3 3m-6.4-2.2L12 5l2 2M10 9l-7 7 4 4 7-7m4.3-4.3l-4-4m2 10.7l2 2M21 3l-6 6"></path>
          </svg>
        </div>
        <div>
          <h2>Tools for Ambassadors</h2>
          <p>If you help run your local game, your login gives you access to powerful tools.</p>
        </div>
      </section>

      <section class="cta-footer">
        <bike-tag-button variant="light" text="Create Account" @click="login" />
      </section>
    </div>
  </div>
  <div v-else class="container">
    <p class="mt-5 mb-5 description">
      {{ $t('pages.login.disabled') }}
    </p>
  </div>
</template>
<!-- eslint-disable vue/multi-word-component-names -->
<script setup name="LoginView">
import BikeTagSvg from '@/assets/images/BikeTag.svg'
import { isAuthenticationEnabled } from '@/common'
import { useBikeTagStore } from '@/store/index'
import { useAuth0 } from '@auth0/auth0-vue'
import { computed, inject } from 'vue'

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
        await store.fetchCredentials(true)
      }
    })
  }
}
</script>
<!-- eslint-disable vue/multi-word-component-names -->
<style lang="scss" scoped>
.login-benefits {
  background: linear-gradient(to bottom, #0b1a36, #131c3a);
  color: #ffffff;
  padding: 2rem;
  text-align: center;

  h1 {
    font-size: 2.5rem;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
  }

  p {
    max-width: 600px;
    margin: 0 auto 1rem auto;
    line-height: 1.4;
    font-size: 1rem;
  }

  .cta {
    background-color: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: #2563eb;
    }
  }

  .primary-cta {
    margin-top: 1rem;
  }

  section.hero {
    padding: 3rem 1rem;
  }

  section.benefit {
    display: flex;
    align-items: center;
    text-align: left;
    max-width: 600px;
    margin: 2rem auto;
    gap: 1rem;

    .icon {
      width: 3rem;
      height: 3rem;
      flex-shrink: 0;
      color: #3b82f6;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    h2 {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.85;
    }
  }

  section.cta-footer {
    margin-top: 3rem;
  }

  .secondary-cta {
    background-color: #10b981;
    &:hover {
      background-color: #059669;
    }
  }
}
</style>