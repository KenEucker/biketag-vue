<template>
  <div class="notification-test container">
    <h1>Resend Notifications</h1>
    <p>Choose which notification destinations to resend for the latest live BikeTag post.</p>

    <p v-if="!isBikeTagAdmin" role="alert">This page requires BikeTag Admin access.</p>
    <template v-else>
      <p class="alert alert-warning" role="note">
        Selected destinations receive real messages. Game email goes to this game's ambassadors.
        Global destinations are configured server-wide.
      </p>
      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-if="message" class="text-success" role="status">{{ message }}</p>

      <fieldset v-for="group in channelGroups" :key="group.name" class="channel-group">
        <legend>{{ group.name }}</legend>
        <label v-for="channel in group.channels" :key="channel.value" class="channel-option">
          <input
            v-model="selectedTargets"
            type="checkbox"
            :value="channel.value"
            :disabled="working"
          />
          {{ channel.label }}
        </label>
      </fieldset>

      <button
        class="btn btn-primary"
        type="button"
        :disabled="working || !selectedTargets.length"
        @click="resendNotifications"
      >
        {{ working ? 'Sending notifications…' : 'Resend Selected Notifications' }}
      </button>

      <section v-if="results.length" class="results" aria-labelledby="results-heading">
        <h2 id="results-heading">Destination results</h2>
        <p v-if="deliverySummary" class="delivery-summary">
          Sent: {{ deliverySummary.sent }} · Skipped: {{ deliverySummary.skipped }} ·
          Failed: {{ deliverySummary.failed }}
        </p>
        <ul>
          <li v-for="(result, index) in results" :key="index">
            <template v-if="isDeliveryReport(result)">
              <strong>{{ result.target }}</strong>: {{ result.status }}
              <span v-if="result.result !== undefined"> — {{ formatResult(result.result) }}</span>
              <span v-else-if="result.reason"> — {{ result.reason }}</span>
            </template>
            <template v-else>{{ formatResult(result) }}</template>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup name="NotificationTestView">
import { useBikeTagStore } from '@/store/index'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const channelGroups = [
  {
    name: 'Game-specific',
    channels: [
      { value: 'game-email', label: 'Email to this game’s ambassadors' },
      { value: 'game-discord', label: 'This game’s Discord webhook' },
      { value: 'game-slack', label: 'This game’s Slack webhook' },
    ],
  },
  {
    name: 'Global',
    channels: [
      { value: 'global-discord', label: 'Global Discord webhook' },
      { value: 'global-slack', label: 'Global Slack webhook' },
      { value: 'global-bluesky', label: 'Global Bluesky account' },
    ],
  },
]
const selectedTargets = ref([])
const store = useBikeTagStore()
const router = useRouter()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const working = ref(false)
const error = ref('')
const message = ref('')
const results = ref([])
const deliverySummary = computed(() => {
  const reports = results.value.filter(isDeliveryReport)
  if (!reports.length) return null
  return {
    sent: reports.filter((report) => report.status === 'sent').length,
    skipped: reports.filter((report) => report.status === 'skipped').length,
    failed: reports.filter((report) => report.status === 'failed').length,
  }
})

function isDeliveryReport(result) {
  return result && typeof result === 'object' && 'target' in result && 'status' in result
}

function formatResult(result) {
  return typeof result === 'string' ? result : JSON.stringify(result)
}

async function resendNotifications() {
  const selectedLabels = channelGroups
    .flatMap((group) => group.channels)
    .filter((channel) => selectedTargets.value.includes(channel.value))
    .map((channel) => channel.label)
    .join(', ')

  if (
    !window.confirm(
      `Resend notifications to: ${selectedLabels}? This can send real email and social messages.`,
    )
  ) {
    return
  }

  working.value = true
  error.value = ''
  message.value = ''
  results.value = []

  try {
    const result = await store.resendLatestPostNotifications(selectedTargets.value)
    if (typeof result === 'string') {
      error.value = result
      return
    }

    results.value = Array.isArray(result) ? result : result ? [result] : []
    message.value = results.value.length
      ? 'Notification request completed. Review each destination below.'
      : 'The server returned no destination report. Check the function logs for request-level errors.'
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

  .channel-group {
    border: 1px dashed #000;
    margin: 1rem auto;
    max-width: 480px;
    padding: 1rem;
    text-align: left;
  }

  .channel-option {
    display: block;
    margin: 0.75rem 0;
  }

  .results {
    margin-top: 2rem;
    text-align: left;
    overflow-wrap: anywhere;
  }
}
</style>
