<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading v-show="loading" v-model:active="loading" :is-full-page="true" class="realign-spinner">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div class="game-settings container">
    <img class="settings-icon" src="/images/biketag-ambassador.svg" alt="Settings Icon" />
    <h1>Game Settings</h1>
    <p>
      Configuration for <strong>{{ getGameNameProper }}</strong
      >. BikeTag Ambassadors can review settings here and request changes from support. BikeTag
      Admins can edit values directly.
    </p>

    <p v-if="loadError" class="error-banner">{{ loadError }}</p>

    <div v-if="settings.length" class="settings-panel">
      <div class="settings-toolbar">
        <span>{{ settings.length }} setting{{ settings.length === 1 ? '' : 's' }}</span>
        <bike-tag-button
          v-if="isBikeTagAdmin && hasPendingChanges"
          variant="medium"
          text="Save changes"
          :disabled="saving"
          @click="saveChanges"
        />
      </div>

      <ul class="settings-list">
        <li v-for="setting in settings" :key="settingKey(setting)" class="setting-item">
          <div class="setting-header">
            <h2>{{ setting.name || setting.key }}</h2>
            <code class="setting-key">{{ setting.key }}</code>
          </div>
          <p v-if="setting.description" class="setting-description">{{ setting.description }}</p>

          <div class="setting-value-row">
            <label :for="inputId(setting)">Value</label>
            <textarea
              v-if="isBikeTagAdmin"
              :id="inputId(setting)"
              v-model="editableValues[settingKey(setting)]"
              class="setting-input"
              rows="2"
            />
            <output v-else :id="inputId(setting)" class="setting-readonly">
              {{ setting.value || '—' }}
            </output>
          </div>

          <div class="setting-actions">
            <a
              v-if="!isBikeTagAdmin"
              class="request-change-link"
              :href="supportMailto(setting)"
            >
              Request change via support
            </a>
            <span
              v-else-if="isValueChanged(setting)"
              class="pending-change"
            >
              Unsaved change
            </span>
          </div>
        </li>
      </ul>

      <div v-if="!isBikeTagAdmin" class="support-note">
        <p>
          To change a setting, email
          <a :href="generalSupportMailto">{{ supportEmail }}</a>
          with the setting key, current value, and what you would like changed.
        </p>
      </div>
    </div>

    <div v-else-if="!loading && !loadError" class="settings-panel settings-panel--empty">
      <p>No settings were returned for this game.</p>
    </div>

    <div class="back-link">
      <router-link to="/dashboard">← Back to Ambassador Dashboard</router-link>
    </div>
  </div>
</template>

<script setup name="GameSettingsView">
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, ref } from 'vue'
import Loading from 'vue-loading-overlay'
import { useRouter } from 'vue-router'

import BikeTagButton from '@/components/BikeTagButton.vue'

const supportEmail = 'support@biketag.org'
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const settings = ref([])
const editableValues = ref({})

const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const getGameNameProper = computed(() => store.getGameNameProper)

const hasPendingChanges = computed(() =>
  settings.value.some((setting) => isValueChanged(setting)),
)

function settingKey(setting) {
  return setting._id || setting.key || setting.slug
}

function inputId(setting) {
  return `setting-${settingKey(setting).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function isValueChanged(setting) {
  const key = settingKey(setting)
  return (editableValues.value[key] ?? '') !== (setting.value ?? '')
}

function supportMailto(setting) {
  const subject = encodeURIComponent(
    `[${store.getGameName}] Setting change request: ${setting.key}`,
  )
  const body = encodeURIComponent(
    [
      `Game: ${store.getGameNameProper} (${store.getGameName})`,
      `Setting: ${setting.name || setting.key}`,
      `Key: ${setting.key}`,
      `Current value: ${setting.value ?? ''}`,
      '',
      'Requested change:',
      '',
      `— ${store.getProfile?.name || store.getProfile?.email || 'BikeTag Ambassador'}`,
    ].join('\n'),
  )
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`
}

const generalSupportMailto = computed(() => {
  const subject = encodeURIComponent(`[${store.getGameName}] Game settings change request`)
  const body = encodeURIComponent(
    [
      `Game: ${store.getGameNameProper} (${store.getGameName})`,
      '',
      'Please describe the setting(s) you would like changed:',
      '',
      `— ${store.getProfile?.name || store.getProfile?.email || 'BikeTag Ambassador'}`,
    ].join('\n'),
  )
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`
})

function syncEditableValues(nextSettings) {
  const values = {}
  for (const setting of nextSettings) {
    values[settingKey(setting)] = setting.value ?? ''
  }
  editableValues.value = values
}

async function loadSettings() {
  loading.value = true
  loadError.value = ''

  const result = await store.fetchGameSettings()
  loading.value = false

  if (typeof result === 'string') {
    loadError.value = result
    settings.value = []
    return
  }

  settings.value = [...result].sort((a, b) => a.key.localeCompare(b.key))
  syncEditableValues(settings.value)
}

async function saveChanges() {
  const updates = settings.value
    .filter((setting) => isValueChanged(setting))
    .map((setting) => ({
      _id: setting._id,
      key: setting.key,
      value: editableValues.value[settingKey(setting)] ?? '',
    }))
    .filter((setting) => setting._id && setting.key)

  if (!updates.length) {
    return
  }

  saving.value = true
  const result = await store.updateGameSettings(updates)
  saving.value = false

  if (typeof result === 'string') {
    toast.open({
      message: result,
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }

  toast.open({
    message: `Saved ${updates.length} setting${updates.length === 1 ? '' : 's'}.`,
    type: 'success',
    position: 'top',
  })

  await loadSettings()
}

onMounted(async () => {
  await store.isReady()

  if (!isBikeTagAmbassador.value) {
    router.push('/')
    return
  }

  await loadSettings()
})
</script>

<style scoped lang="scss">
.game-settings {
  background-color: #fff;
  color: #000;
  padding: 2rem;
  max-width: 860px;
  margin: 0 auto;
  font-family: 'Courier New', monospace;

  h1 {
    font-size: 2rem;
    font-weight: bold;
    border-bottom: 2px dashed #000;
    display: inline-block;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    text-align: center;
    width: 100%;
  }

  p {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .settings-icon {
    display: block;
    width: 72px;
    margin: 0 auto 1rem;
  }

  .error-banner {
    border: 2px dashed #c00;
    color: #c00;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .settings-panel {
    border: 2px dashed #000;
    padding: 1.5rem;
    margin-bottom: 2rem;
    text-align: left;

    &--empty {
      text-align: center;
    }
  }

  .settings-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    font-weight: bold;
  }

  .settings-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .setting-item {
    border: 1px solid #000;
    padding: 1rem;
  }

  .setting-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    h2 {
      font-size: 1.1rem;
      margin: 0;
    }
  }

  .setting-key {
    font-size: 0.85rem;
    background: #f5f5f5;
    padding: 0.15rem 0.4rem;
  }

  .setting-description {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: #333;
  }

  .setting-value-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    label {
      font-weight: bold;
      font-size: 0.9rem;
    }
  }

  .setting-input,
  .setting-readonly {
    width: 100%;
    font-family: inherit;
    font-size: 0.95rem;
    border: 1px dashed #000;
    padding: 0.5rem;
    background: #fff;
  }

  .setting-readonly {
    display: block;
    min-height: 2.5rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .setting-actions {
    margin-top: 0.75rem;
  }

  .request-change-link,
  .back-link a {
    color: #000;
    font-weight: bold;
  }

  .pending-change {
    font-size: 0.85rem;
    font-weight: bold;
    color: #a60;
  }

  .support-note {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px dashed #000;
    text-align: center;
  }

  .back-link {
    text-align: center;
    margin-top: 1rem;
  }
}
</style>
