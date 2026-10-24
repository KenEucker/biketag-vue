<template>
  <main class="api-page">
    <div class="api-page__intro">
      <router-link to="/">← Back to BikeTag</router-link>
      <p class="api-page__eyebrow">FOR THE CURIOUS & THE BUILDERS</p>
      <h1>BikeTag API</h1>
      <p>Explore the game behind the photos. Make a request and unfold the response.</p>
    </div>

    <section class="api-page__card" aria-labelledby="api-guide">
      <h2 id="api-guide">How to use the API</h2>
      <p>
        Send a <code>GET</code> request to an endpoint below using your game's subdomain (for
        example, <code>portland.biketag.org</code>). Add endpoint options in the query string, such
        as <code>/api/current?data=true</code>. Separate further parameters with <code>&amp;</code>.
        This explorer sends GET requests; authenticated changes use the individual endpoint's
        required method and credentials.
      </p>
      <p>
        API links opened within the app use this explorer. Direct visits and hard refreshes return
        the normal API response. You can also call endpoint URLs directly from your code.
      </p>
      <pre class="api-page__example"><code>{{ codeExample }}</code></pre>
      <details class="api-page__endpoints" :open="isLanding">
        <summary>Explore endpoints</summary>
        <ul>
          <li v-for="endpoint in apiEndpoints" :key="endpoint.path">
            <router-link :to="endpoint.path"
              ><code>{{ endpoint.path }}</code></router-link
            >
            <span>{{ endpoint.description }}</span>
          </li>
        </ul>
      </details>
    </section>

    <section class="api-page__card" aria-labelledby="api-request">
      <h2 id="api-request">Try a request</h2>
      <form @submit.prevent="submitRequest">
        <label for="api-path">Endpoint and query parameters</label>
        <div class="api-page__request-row">
          <span class="api-page__method">GET</span>
          <input
            id="api-path"
            v-model="requestPath"
            type="text"
            spellcheck="false"
            required
            aria-describedby="api-path-help"
          />
          <button type="submit">{{ loading ? 'Send again' : 'Send request' }}</button>
        </div>
        <p id="api-path-help" class="api-page__muted">
          Try /api/game?game=portland or /api/current?data=true for current tag JSON.
        </p>
      </form>
      <p v-if="inputError" role="alert" class="api-page__error">{{ inputError }}</p>
    </section>

    <section class="api-page__card" aria-labelledby="api-response" :aria-busy="loading">
      <div class="api-page__response-heading">
        <h2 id="api-response">Response</h2>
        <span v-if="result" :class="['api-page__status', { 'api-page__error': !result.ok }]">
          HTTP {{ result.status }} · {{ elapsed }} ms
        </span>
      </div>
      <p v-if="loading" role="status">Loading {{ activePath }}…</p>
      <p v-else-if="requestError" role="alert" class="api-page__error">{{ requestError }}</p>
      <template v-else-if="result">
        <p v-if="!result.ok" role="alert" class="api-page__error">
          The API returned an error. Its response is shown below.
        </p>
        <div class="api-page__toolbar">
          <template v-if="result.isJson">
            <button type="button" @click="setExpansion(true)">Expand all</button>
            <button type="button" @click="setExpansion(false)">Collapse all</button>
            <button type="button" @click="copyJson">Copy JSON</button>
          </template>
          <a :href="rawPath" target="_blank" rel="noopener">Open raw response ↗</a>
          <span role="status">{{ copyMessage }}</span>
        </div>
        <json-tree
          v-if="result.isJson"
          :key="responseVersion"
          class="api-page__json"
          :value="result.data"
          :expansion="expansion"
        />
        <template v-else>
          <p>
            {{
              result.text
                ? 'This endpoint returned a non-JSON response.'
                : 'No JSON body was returned.'
            }}
            <template v-if="result.contentType">Content type: {{ result.contentType }}.</template>
            Use the raw response link to view images or other content.
          </p>
          <pre v-if="result.text" class="api-page__plain">{{ result.text }}</pre>
        </template>
      </template>
      <p v-else class="api-page__muted">
        Choose an endpoint above or send a request to see its JSON here.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import JsonTree from '@/components/JsonTree.vue'
import { apiEndpoints, fetchApiResponse, getRawApiPath, resolveApiUrl } from '@/common/api'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const routePath = computed(() => route.fullPath.split('#')[0])
const isLanding = computed(() => /^\/api\/?$/.test(route.path) && !Object.keys(route.query).length)
const requestPath = ref('/api/game')
const activePath = ref('')
const rawPath = ref('')
const inputError = ref('')
const requestError = ref('')
const loading = ref(false)
const result = shallowRef<Awaited<ReturnType<typeof fetchApiResponse>> | null>(null)
const elapsed = ref(0)
const responseVersion = ref(0)
const expansion = shallowRef<{ open: boolean; version: number } | null>(null)
const copyMessage = ref('')
let controller: AbortController | undefined

const codeExample = computed(() => {
  const example = new URL(activePath.value || '/api/game?game=portland', window.location.origin)
  return `const response = await fetch(${JSON.stringify(example.href)}, {\n  headers: { Accept: 'application/json' }\n})\nconst data = await response.json()`
})

function setExpansion(open: boolean) {
  expansion.value = { open, version: (expansion.value?.version ?? 0) + 1 }
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(result.value?.data, null, 2))
    copyMessage.value = 'JSON copied.'
  } catch {
    copyMessage.value = 'Copy failed. Open the raw response to copy it.'
  }
}

async function loadResponse(path: string) {
  controller?.abort()
  result.value = null
  requestError.value = ''
  inputError.value = ''
  copyMessage.value = ''
  expansion.value = null
  loading.value = false
  let url: URL
  try {
    url = resolveApiUrl(path, window.location.origin)
  } catch (error) {
    inputError.value = (error as Error).message
    return
  }
  activePath.value = `${url.pathname}${url.search}`
  rawPath.value = getRawApiPath(url)
  const currentController = new AbortController()
  controller = currentController
  loading.value = true
  const started = performance.now()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    currentController.abort()
  }, 30000)
  try {
    const response = await fetchApiResponse(activePath.value, currentController.signal)
    if (currentController.signal.aborted) return
    result.value = response
    elapsed.value = Math.round(performance.now() - started)
    responseVersion.value++
  } catch {
    if (controller === currentController && (!currentController.signal.aborted || timedOut)) {
      requestError.value = timedOut
        ? 'The request timed out. Try sending it again.'
        : 'Could not reach the API. Check your connection and try again.'
    }
  } finally {
    window.clearTimeout(timeout)
    if (controller === currentController) loading.value = false
  }
}

async function submitRequest() {
  try {
    const url = resolveApiUrl(requestPath.value, window.location.origin)
    const path = `${url.pathname}${url.search}`
    if (path === routePath.value) await loadResponse(path)
    else await router.push(path)
  } catch (error) {
    inputError.value = (error as Error).message
  }
}

watch(
  routePath,
  (path) => {
    controller?.abort()
    if (isLanding.value) {
      requestPath.value = '/api/game'
      activePath.value = ''
      result.value = null
      loading.value = false
      inputError.value = ''
      requestError.value = ''
    } else {
      requestPath.value = path
      loadResponse(path)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => controller?.abort())
</script>

<style scoped lang="scss">
.api-page {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  color: #253848;
  font:
    1rem / 1.65 system-ui,
    sans-serif;
  text-align: left;

  h1,
  h2 {
    color: #253848;
    font-family: system-ui, sans-serif;
    font-weight: 750;
  }

  h1 {
    margin: 0.5rem 0 1rem;
    font-size: clamp(2.5rem, 6vw, 4rem);
    letter-spacing: -0.05em;
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  a {
    color: #216078;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  code,
  pre,
  input {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }

  code {
    color: #305d71;
    overflow-wrap: anywhere;
  }

  button {
    padding: 0.5rem 0.85rem;
    border: 1px solid #bdcdd4;
    border-radius: 6px;
    background: white;
    color: #253848;
    font: inherit;
    cursor: pointer;
  }

  &__intro {
    padding: 0.5rem 0 1rem;
  }

  &__eyebrow {
    margin: 2rem 0 0;
    color: #4b6677;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  &__card {
    margin-bottom: 1.25rem;
    padding: clamp(1rem, 3vw, 2rem);
    border: 1px solid #d7e0e4;
    border-radius: 12px;
    background: white;
    box-shadow: 0 4px 16px #25384808;
  }

  &__example,
  &__plain {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 6px;
    background: #f2f6f8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 0.85rem;
  }

  &__endpoints {
    summary {
      cursor: pointer;
      font-weight: 650;
    }

    ul {
      padding: 0;
      margin: 1rem 0 0;
      list-style: none;
    }

    li {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1.25rem;
      padding: 0.65rem 0;
      border-top: 1px solid #e7edef;
    }

    a {
      min-width: min(16rem, 100%);
    }
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__request-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;

    input {
      flex: 1 1 15rem;
      min-width: 0;
      padding: 0.65rem;
      border: 1px solid #bdcdd4;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    button {
      background: #253848;
      color: white;
    }
  }

  &__method {
    color: #1a714d;
    font-size: 0.8rem;
    font-weight: 750;
  }

  &__muted {
    margin: 0.75rem 0 0;
    color: #5d7180;
    font-size: 0.875rem;
  }

  &__response-heading,
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    font-size: 0.8rem;

    h2 {
      margin: 0;
    }
  }

  &__toolbar {
    justify-content: flex-start;
  }

  &__status {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    background: #edf6f1;
    color: #1a714d;
  }

  &__error {
    color: #a32d3e;
  }

  &__json {
    max-height: 70vh;
    overflow: auto;
    padding: 1rem;
    border: 1px solid #dbe2e8;
    border-radius: 6px;
    background: #fafcfd;
  }

  button:hover {
    background: #edf3f6;
  }

  &__request-row button:hover {
    background: #36566d;
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  summary:focus-visible {
    outline: 2px solid #266d85;
    outline-offset: 3px;
  }
}
</style>
