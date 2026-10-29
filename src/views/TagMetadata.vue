<template>
  <div class="tag-metadata container">
    <h1>Tag Metadata</h1>
    <p v-if="!isBikeTagAdmin" role="alert">This page requires BikeTag Admin access.</p>
    <template v-else>
      <p>
        Retrieve the exact <code>data</code> value from a published tag image in DigitalOcean, or
        generate it from BikeTag fields. This tool does not save changes to the tag or storage.
      </p>
      <form class="metadata-form" @submit.prevent="retrieve">
        <fieldset :disabled="working">
          <div class="selectors">
            <div>
              <label for="metadata-tag" class="form-label">Tag number</label>
              <input
                id="metadata-tag"
                v-model="tagnumber"
                class="form-control"
                type="number"
                min="1"
                step="1"
                required
              />
            </div>
            <div>
              <label for="metadata-type" class="form-label">Image metadata</label>
              <select id="metadata-type" v-model="type" class="form-select">
                <option value="mystery">Mystery</option>
                <option value="found">Found</option>
              </select>
            </div>
          </div>
          <p class="form-text">Found metadata belongs to the tag number that was found.</p>
          <button type="submit" class="btn btn-primary" :disabled="!ready">
            {{ operation === 'retrieve' ? 'Retrieving…' : 'Get saved encoded data' }}
          </button>
        </fieldset>
      </form>

      <form class="metadata-form" @submit.prevent="generate">
        <fieldset :disabled="working">
          <legend>Generate from BikeTag fields</legend>
          <p>
            Enter fields below, or load them from this tag. Times use Unix seconds. Empty fields are
            omitted.
          </p>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="!ready"
            @click="loadFields"
          >
            {{ operation === 'load' ? 'Loading…' : 'Load fields from tag' }}
          </button>
          <div v-for="field in textFields" :key="field" class="field-row">
            <label :for="`metadata-${field}`" class="form-label">{{ field }}</label>
            <input
              :id="`metadata-${field}`"
              v-model="fields[field]"
              class="form-control"
              :type="field.endsWith('Time') ? 'number' : 'text'"
              :min="field.endsWith('Time') ? 0 : undefined"
              :step="field.endsWith('Time') ? 1 : undefined"
            />
          </div>
          <template v-if="type === 'found'">
            <div class="selectors field-row">
              <div v-for="(label, coordinate) in coordinates" :key="coordinate">
                <label :for="`metadata-${coordinate}`" class="form-label">{{ label }}</label>
                <input
                  :id="`metadata-${coordinate}`"
                  v-model="gps[coordinate]"
                  class="form-control"
                  type="number"
                  step="any"
                  :min="coordinate === 'lat' ? -90 : coordinate === 'long' ? -180 : undefined"
                  :max="coordinate === 'lat' ? 90 : coordinate === 'long' ? 180 : undefined"
                />
              </div>
            </div>
            <div class="field-row">
              <label for="metadata-boundary" class="form-label">confirmedBoundary</label>
              <select id="metadata-boundary" v-model="confirmedBoundary" class="form-select">
                <option value="">Omit</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          </template>
          <button type="submit" class="btn btn-primary" :disabled="!ready">
            {{ operation === 'generate' ? 'Generating…' : 'Generate encoded data' }}
          </button>
        </fieldset>
      </form>

      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <section v-if="entries.length" aria-label="Encoded metadata results" class="results">
        <h2>{{ resultLabel }}</h2>
        <div v-for="(entry, index) in entries" :key="entry.key || index" class="metadata-entry">
          <p v-if="entry.key">
            <code>{{ entry.key }}</code>
          </p>
          <template v-if="entry.encoded !== null">
            <label :for="`encoded-${index}`" class="form-label">Encoded data</label>
            <textarea
              :id="`encoded-${index}`"
              :value="entry.encoded"
              class="form-control"
              rows="4"
              readonly
              spellcheck="false"
            />
            <button type="button" class="btn btn-outline-primary" @click="copy(entry.encoded)">
              Copy encoded data
            </button>
            <details>
              <summary>Decoded data</summary>
              <pre>{{ JSON.stringify(entry.decoded, null, 2) }}</pre>
            </details>
          </template>
          <p v-else role="status">
            This image has no saved <code>data</code> metadata. You can generate it from the fields
            above.
          </p>
        </div>
      </section>
    </template>
    <router-link to="/dashboard">← Back to Ambassador Dashboard</router-link>
  </div>
</template>

<script setup name="TagMetadataView">
import { tagMetadataFields } from '@/common/tag-metadata'
import { useBikeTagStore } from '@/store/index'
import { computed, nextTick, reactive, ref, watch } from 'vue'

const store = useBikeTagStore()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const tagnumber = ref('')
const type = ref('mystery')
const fields = reactive({})
const gps = reactive({ lat: '', long: '', alt: '' })
const coordinates = { lat: 'Latitude', long: 'Longitude', alt: 'Altitude' }
const confirmedBoundary = ref('')
const operation = ref('')
const working = computed(() => !!operation.value)
const ready = computed(
  () =>
    isBikeTagAdmin.value &&
    !!store.auth0Token &&
    Number.isSafeInteger(Number(tagnumber.value)) &&
    Number(tagnumber.value) > 0,
)
const textFields = computed(() =>
  Object.values(tagMetadataFields[type.value]).filter(
    (field) => !['tagnumber', 'gps', 'confirmedBoundary'].includes(field),
  ),
)
const entries = ref([])
const resultLabel = ref('')
const error = ref('')
const notice = ref('')

function clearResult() {
  entries.value = []
  error.value = ''
  notice.value = ''
}
function clearFields() {
  Object.keys(fields).forEach((field) => delete fields[field])
  Object.keys(gps).forEach((coordinate) => {
    gps[coordinate] = ''
  })
  confirmedBoundary.value = ''
}
watch(tagnumber, () => {
  clearFields()
  clearResult()
})
watch(type, clearResult)
watch([fields, gps, confirmedBoundary], clearResult)
watch(isBikeTagAdmin, (admin) => {
  if (!admin) {
    clearFields()
    clearResult()
  }
})

async function request(action, tag) {
  if (working.value || !ready.value) return
  clearResult()
  operation.value = action
  try {
    const result = await store.tagMetadata({
      action,
      type: type.value,
      tagnumber: Number(tagnumber.value),
      ...(tag ? { tag } : {}),
    })
    if (!isBikeTagAdmin.value) return
    if (action === 'load') {
      clearFields()
      for (const field of [
        ...Object.values(tagMetadataFields.mystery),
        ...Object.values(tagMetadataFields.found),
      ]) {
        if (!['tagnumber', 'gps', 'confirmedBoundary'].includes(field) && result.tag[field] != null)
          fields[field] = result.tag[field]
      }
      for (const coordinate of Object.keys(gps))
        gps[coordinate] = result.tag.gps?.[coordinate] ?? ''
      if (typeof result.tag.confirmedBoundary === 'boolean')
        confirmedBoundary.value = String(result.tag.confirmedBoundary)
      // Field watchers finish before publishing the load status.
      await nextTick()
      notice.value = `Loaded fields from tag #${tagnumber.value}. Review them before generating.`
    } else {
      entries.value = result.entries
      resultLabel.value = `${action === 'retrieve' ? 'Saved' : 'Generated'} ${type.value} metadata for tag #${tagnumber.value}`
    }
  } catch (cause) {
    error.value = cause.message || 'Unable to process tag metadata.'
  } finally {
    operation.value = ''
  }
}
function retrieve() {
  return request('retrieve')
}
function loadFields() {
  return request('load')
}
function generate() {
  const tag = {}
  for (const field of textFields.value) {
    if (fields[field] !== undefined && fields[field] !== '')
      tag[field] = field.endsWith('Time') ? Number(fields[field]) : fields[field]
  }
  if (type.value === 'found') {
    if (Object.values(gps).some((value) => value !== '')) {
      if (gps.lat === '' || gps.long === '') {
        error.value = 'Enter both latitude and longitude.'
        return
      }
      tag.gps = {
        lat: Number(gps.lat),
        long: Number(gps.long),
        ...(gps.alt !== '' ? { alt: Number(gps.alt) } : {}),
      }
    }
    if (confirmedBoundary.value !== '') tag.confirmedBoundary = confirmedBoundary.value === 'true'
  }
  return request('generate', tag)
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value)
    notice.value = 'Encoded data copied.'
  } catch {
    error.value = 'Unable to copy automatically. Select and copy the encoded data above.'
  }
}
</script>

<style scoped lang="scss">
.tag-metadata {
  max-width: 900px;
  padding: 2rem 1rem;
  background: #fff;
  color: #000;
  font-family: 'Courier New', monospace;

  h1 {
    font-size: 2rem;
  }

  h2,
  legend {
    font-size: 1.25rem;
  }
}

.metadata-form,
.results {
  margin-bottom: 2rem;
}

.selectors {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.selectors > div {
  flex: 1 1 150px;
}

.field-row {
  margin: 1rem 0;
}

.metadata-entry {
  margin: 1rem 0;
}

.metadata-entry button,
details {
  margin-top: 0.75rem;
}

pre {
  padding: 1rem;
  background: #f5f5f5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

code {
  overflow-wrap: anywhere;
}
</style>
