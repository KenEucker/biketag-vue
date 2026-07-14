<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="game-settings container">
    <img class="settings-icon" src="/images/biketag-ambassador.svg" alt="Settings Icon" />
    <h1>Game Settings</h1>
    <p>
      Configuration for <strong>{{ getGameNameProper }}</strong>. BikeTag Ambassadors can review
      settings here and request changes from support. BikeTag Admins can edit values directly.
    </p>

    <p v-if="loading" class="status-message">Loading settings…</p>
    <p v-else-if="loadError" class="error-banner">{{ loadError }}</p>

    <template v-else>
      <div v-if="!settings.length" class="settings-panel settings-panel--empty">
        <p>No settings were returned for this game.</p>
      </div>

      <div v-else class="settings-panel">
        <div class="settings-toolbar">
          <span>{{ settings.length }} setting{{ settings.length === 1 ? '' : 's' }}</span>
          <bike-tag-button
            v-if="isBikeTagAdmin"
            variant="medium"
            text="Save changes"
            :disabled="saving || !hasPendingChanges"
            @click="saveChanges"
          />
        </div>

        <ul class="settings-list">
          <li
            v-for="(setting, index) in settings"
            :key="settingKey(setting, index)"
            class="setting-item"
          >
            <div class="setting-header">
              <h2>{{ setting.name || setting.key || 'Setting' }}</h2>
              <code v-if="setting.key" class="setting-key">{{ setting.key }}</code>
            </div>
            <p v-if="setting.description" class="setting-description">{{ setting.description }}</p>

            <div class="setting-value-row">
              <label :for="inputId(setting, index)">Value</label>
              <textarea
                v-if="isBikeTagAdmin"
                :id="inputId(setting, index)"
                v-model="editableValues[settingKey(setting, index)]"
                class="setting-input"
                rows="2"
              />
              <pre v-else :id="inputId(setting, index)" class="setting-readonly">{{
                displayValue(setting)
              }}</pre>
            </div>

            <div v-if="!isBikeTagAdmin" class="setting-actions">
              <button type="button" class="request-change-link" @click="openRequestModal(setting)">
                Request change via support
              </button>
            </div>
          </li>
        </ul>

        <div v-if="!isBikeTagAdmin" class="support-note">
          <p>
            Use the button on each setting to send a change request to
            <strong>{{ supportEmail }}</strong>.
          </p>
        </div>
      </div>
    </template>

    <div class="back-link">
      <router-link to="/dashboard">← Back to Ambassador Dashboard</router-link>
    </div>

    <b-modal
      v-model="requestModalOpen"
      title="Request Setting Change"
      hide-footer
      @hidden="resetRequestForm"
    >
      <div v-if="requestSetting" class="request-modal">
        <p class="request-modal__intro">
          Send a change request to <strong>{{ supportEmail }}</strong> for the setting below.
        </p>

        <div class="request-modal__setting">
          <strong>{{ requestSetting.name || requestSetting.key || 'Setting' }}</strong>
          <code v-if="requestSetting.key">{{ requestSetting.key }}</code>
        </div>

        <p v-if="requestSetting.description" class="request-modal__description">
          {{ requestSetting.description }}
        </p>

        <div class="request-modal__field">
          <span class="request-modal__label">Current value</span>
          <pre class="setting-readonly">{{ displayValue(requestSetting) }}</pre>
        </div>

        <div class="request-modal__field">
          <label for="requested-value">Requested value</label>
          <input
            id="requested-value"
            v-model="requestForm.requestedValue"
            class="setting-input"
            type="text"
            autocomplete="off"
          />
        </div>

        <div class="request-modal__field">
          <label for="request-reason">Why is this change needed?</label>
          <textarea
            id="request-reason"
            v-model="requestForm.reason"
            class="setting-input"
            rows="4"
          />
        </div>

        <div class="request-modal__actions">
          <bike-tag-button variant="medium" text="Cancel" @click="closeRequestModal" />
          <bike-tag-button
            variant="medium-orange"
            text="Send request"
            :disabled="requestSending || !canSubmitRequest"
            @click="submitRequest"
          />
        </div>
      </div>
    </b-modal>
  </div>
</template>

<script setup name="GameSettingsView">
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, reactive, ref } from 'vue'
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
const requestModalOpen = ref(false)
const requestSending = ref(false)
const requestSetting = ref(null)
const requestForm = reactive({
  requestedValue: '',
  reason: '',
})

const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const getGameNameProper = computed(() => store.getGameNameProper)

const hasPendingChanges = computed(() =>
  settings.value.some((setting, index) => isValueChanged(setting, index)),
)

const canSubmitRequest = computed(
  () => requestForm.requestedValue.trim().length > 0 && requestForm.reason.trim().length > 0,
)

function settingKey(setting, index = 0) {
  return setting._id || setting.key || setting.slug || `setting-${index}`
}

function inputId(setting, index = 0) {
  return `setting-${String(settingKey(setting, index)).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function displayValue(setting) {
  const value = setting?.value
  return value == null || value === '' ? '—' : String(value)
}

function isValueChanged(setting, index = 0) {
  const key = settingKey(setting, index)
  return (editableValues.value[key] ?? '') !== (setting.value ?? '')
}

function normalizeSettings(result) {
  if (Array.isArray(result)) {
    return result
  }
  if (result && Array.isArray(result.data)) {
    return result.data
  }
  return []
}

function syncEditableValues(nextSettings) {
  const values = {}
  nextSettings.forEach((setting, index) => {
    values[settingKey(setting, index)] = setting.value ?? ''
  })
  editableValues.value = values
}

function resetRequestForm() {
  requestSetting.value = null
  requestForm.requestedValue = ''
  requestForm.reason = ''
  requestSending.value = false
}

function openRequestModal(setting) {
  requestSetting.value = setting
  requestForm.requestedValue = setting?.value ?? ''
  requestForm.reason = ''
  requestModalOpen.value = true
}

function closeRequestModal() {
  requestModalOpen.value = false
}

async function submitRequest() {
  if (!requestSetting.value || !canSubmitRequest.value || requestSending.value) {
    return
  }

  requestSending.value = true

  try {
    const result = await store.requestGameSettingChange({
      settingKey: requestSetting.value.key ?? '',
      settingName: requestSetting.value.name || requestSetting.value.key || '',
      settingDescription: requestSetting.value.description ?? '',
      currentValue: requestSetting.value.value ?? '',
      requestedValue: requestForm.requestedValue.trim(),
      reason: requestForm.reason.trim(),
    })

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
      message: 'Your setting change request was sent to support.',
      type: 'success',
      position: 'top',
    })
    closeRequestModal()
  } finally {
    requestSending.value = false
  }
}

async function loadSettings() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await store.fetchGameSettings()

    if (typeof result === 'string') {
      loadError.value = result
      settings.value = []
      return
    }

    const nextSettings = normalizeSettings(result).sort((a, b) =>
      String(a?.key ?? '').localeCompare(String(b?.key ?? '')),
    )
    settings.value = nextSettings
    syncEditableValues(nextSettings)
  } catch (error) {
    console.error('error loading game settings', error)
    loadError.value = 'error loading game settings'
    settings.value = []
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  if (!isBikeTagAdmin.value || saving.value || !hasPendingChanges.value) {
    return
  }

  const updates = settings.value
    .map((setting, index) => ({ setting, index }))
    .filter(({ setting, index }) => isValueChanged(setting, index))
    .map(({ setting, index }) => ({
      _id: setting._id,
      key: setting.key,
      value: editableValues.value[settingKey(setting, index)] ?? '',
    }))
    .filter((setting) => setting._id && setting.key)

  if (!updates.length) {
    return
  }

  saving.value = true
  try {
    const result = await store.updateGameSettings(updates)

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
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await store.isReady()

  if (!isBikeTagAmbassador.value) {
    await router.replace('/')
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
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }

  .settings-icon {
    display: block;
    width: 72px;
    margin: 0 auto 1rem;
  }

  .status-message {
    font-weight: bold;
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
    margin: 0;
    box-sizing: border-box;
  }

  .setting-readonly {
    display: block;
    min-height: 2.5rem;
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left;
  }

  .setting-actions {
    margin-top: 0.75rem;
  }

  .request-change-link {
    background: none;
    border: none;
    padding: 0;
    color: #000;
    font-weight: bold;
    font-family: inherit;
    font-size: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .support-note {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px dashed #000;
    text-align: center;
  }

  .back-link {
    margin-top: 1rem;

    a {
      color: #000;
      font-weight: bold;
    }
  }
}

.request-modal {
  text-align: left;
  font-family: 'Courier New', monospace;

  &__intro {
    margin-bottom: 1rem;
  }

  &__setting {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.05rem;
  }

  &__description {
    margin: 0 0 1rem;
    color: #333;
    font-size: 0.95rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1rem;

    label,
    .request-modal__label {
      font-weight: bold;
      font-size: 0.9rem;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
}
</style>
