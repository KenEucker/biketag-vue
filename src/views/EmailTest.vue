<template>
  <div class="email-test container">
    <h1>Test Emails</h1>
    <p>
      Preview and test BikeTag emails using queued submissions and the current round where
      available. Sample content is used when live data is unavailable.
    </p>

    <p v-if="!isBikeTagAdmin" role="alert">This page requires BikeTag Admin access.</p>
    <template v-else>
      <p v-if="loading" role="status">Loading email templates…</p>
      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-if="success" class="text-success" role="status">{{ success }}</p>

      <template v-if="templates.length">
        <p v-if="!configured" class="alert alert-warning">
          Email delivery is not configured on this server. You can still preview templates.
        </p>
        <p>Test messages go only to the address below and have a [TEST] subject prefix.</p>
        <form class="test-form" @submit.prevent="sendTest">
          <div>
            <label for="email-template" class="form-label">Email template</label>
            <select id="email-template" v-model="template" class="form-select" :disabled="working">
              <option v-for="entry in templates" :key="entry.name" :value="entry.name">
                {{ entry.label }}
              </option>
            </select>
          </div>
          <div>
            <label for="email-recipient" class="form-label">Test recipient</label>
            <input
              id="email-recipient"
              v-model="recipient"
              class="form-control"
              type="email"
              autocomplete="email"
              maxlength="254"
              required
              :disabled="working"
            />
          </div>
          <div class="test-actions">
            <button
              type="button"
              class="btn btn-outline-primary"
              :disabled="working || !template"
              @click="previewTemplate"
            >
              {{ previewing ? 'Loading preview…' : 'Preview email' }}
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="working || !configured || !template || !recipient.trim()"
            >
              {{ sending ? 'Sending…' : 'Send test email' }}
            </button>
          </div>
        </form>

        <section v-if="preview" class="email-preview" aria-label="Email preview">
          <h2>{{ preview.subject }}</h2>
          <p>{{ preview.dataSource }}</p>
          <p>HTML preview</p>
          <iframe title="Test email HTML preview" sandbox="" :srcdoc="preview.html" />
          <details>
            <summary>Plain text version</summary>
            <pre>{{ preview.text }}</pre>
          </details>
        </section>
      </template>
    </template>

    <router-link to="/dashboard">← Back to Ambassador Dashboard</router-link>
  </div>
</template>

<script setup name="EmailTestView">
import { useBikeTagStore } from '@/store/index'
import { computed, ref, watch } from 'vue'

const store = useBikeTagStore()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const templates = ref([])
const template = ref('')
const recipient = ref('')
const configured = ref(false)
const loading = ref(false)
const previewing = ref(false)
const sending = ref(false)
const working = computed(() => loading.value || previewing.value || sending.value)
const preview = ref(null)
const error = ref('')
const success = ref('')

watch(template, () => {
  preview.value = null
  error.value = ''
  success.value = ''
})

watch(
  () => isBikeTagAdmin.value && !!store.auth0Token,
  async (ready) => {
    if (!ready) return
    loading.value = true
    error.value = ''
    try {
      const result = await store.testEmail()
      templates.value = result.templates
      configured.value = result.configured
      recipient.value = result.recipient || ''
      template.value = result.templates[0]?.name || ''
    } catch (cause) {
      error.value = cause.message || 'Unable to load email templates.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

async function previewTemplate() {
  if (working.value || !template.value) return
  previewing.value = true
  error.value = ''
  success.value = ''
  preview.value = null
  try {
    preview.value = await store.testEmail({ action: 'preview', template: template.value })
  } catch (cause) {
    error.value = cause.message || 'Unable to preview this email.'
  } finally {
    previewing.value = false
  }
}

async function sendTest() {
  if (working.value || !configured.value || !template.value || !recipient.value.trim()) return
  sending.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await store.testEmail({
      action: 'send',
      template: template.value,
      recipient: recipient.value.trim(),
    })
    success.value = `Test email accepted by the mail server for ${result.recipient}. ${result.dataSource}`
  } catch (cause) {
    error.value = cause.message || 'Unable to send the test email.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped lang="scss">
.email-test {
  background-color: #fff;
  color: #000;
  max-width: 900px;
  padding: 2rem 1rem;
  font-family: 'Courier New', monospace;

  h1 {
    display: inline-block;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px dashed #000;
    font-size: 2rem;
    font-weight: bold;
  }
}

.test-form {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.test-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.email-preview {
  margin-bottom: 2rem;

  h2 {
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }

  iframe {
    width: 100%;
    height: 750px;
    border: 1px solid #ccc;
    background: #fff;
  }

  pre {
    padding: 1rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: #f5f5f5;
  }
}
</style>
