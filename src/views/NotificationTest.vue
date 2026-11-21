<template>
  <div class="notification-test container">
    <h1>Resend Notifications</h1>
    <p>
      Resend the configured notifications for the latest live BikeTag post. This sends to the
      configured email and social notification destinations.
    </p>

    <p v-if="!isBikeTagAdmin" role="alert">This page requires BikeTag Admin access.</p>
    <template v-else>
      <p class="alert alert-warning" role="note">
        This sends real messages to every enabled notification destination for this game.
      </p>
      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-if="message" class="text-success" role="status">{{ message }}</p>

      <button class="btn btn-primary" type="button" :disabled="working" @click="resendNotifications">
        {{ working ? 'Sending notifications…' : 'Resend Latest Post Notifications' }}
      </button>

      <section v-if="results.length" class="results" aria-labelledby="results-heading">
        <h2 id="results-heading">Delivery results</h2>
        <ul>
          <li v-for="(result, index) in results" :key="index">{{ formatResult(result) }}</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup name="NotificationTestView">
import { useBikeTagStore } from '@/store/index'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useBikeTagStore()
const router = useRouter()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const working = ref(false)
const error = ref('')
const message = ref('')
const results = ref([])

function formatResult(result) {
  return typeof result === 'string' ? result : JSON.stringify(result)
}

async function resendNotifications() {
  if (
    !window.confirm(
      'Resend every configured notification for the latest live BikeTag post? This can send real email and social notifications.',
    )
  ) {
    return
  }

  working.value = true
  error.value = ''
  message.value = ''
  results.value = []

  try {
    const result = await store.resendLatestPostNotifications()
    if (typeof result === 'string') {
      error.value = result
      return
    }

    results.value = Array.isArray(result) ? result : result ? [result] : []
    message.value = results.value.length
      ? 'Notification resend completed.'
      : 'No notification tasks were returned. Check the game notification settings.'
  } catch (err) {
    error.value = err?.message ?? 'Notification resend failed.'
  } finally {
    working.value = false
  }
}

onMounted(async () => {
  await store.isReady()

  if (!isBikeTagAdmin.value) {
    router.replace('/')
  }
})
</script>

<style scoped lang="scss">
.notification-test {
  background-color: #fff;
  color: #000;
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  font-family: 'Courier New', monospace;

  h1 {
    font-size: 2rem;
    font-weight: bold;
    border-bottom: 2px dashed #000;
    display: inline-block;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 1.5rem;
  }

  .results {
    margin-top: 2rem;
    text-align: left;
    overflow-wrap: anywhere;
  }
}
</style>
