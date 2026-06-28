<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading
    v-show="working"
    v-model:active="working"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div v-if="!working" class="admin-page container">
    <img class="admin-icon" src="/images/biketag-ambassador.svg" alt="Admin Icon" />
    <h1>BikeTag Admin</h1>
    <p>
      Queue uploads are normally converted to webp during resize. When that conversion fails, jpg or
      png can remain in the queue. Use this page to scan for those failures and re-run conversion.
    </p>

    <div class="actions">
      <bike-tag-button variant="medium" text="Scan Queue" @click="scanQueue" />
      <bike-tag-button
        variant="medium-orange"
        text="Fix Queue Images"
        :disabled="!issueCount"
        @click="fixQueue"
      />
    </div>

    <div v-if="lastAction" class="status-banner">
      <p>{{ lastAction }}</p>
    </div>

    <div v-if="issues.length" class="issues-panel">
      <h2>{{ issueCount }} issue{{ issueCount === 1 ? '' : 's' }} found</h2>
      <ul>
        <li v-for="(issue, index) in issues" :key="`${issue.tagnumber}-${issue.type}-${index}`">
          <strong>Tag #{{ issue.tagnumber }}</strong>
          <span>{{ issue.foundPlayer ? ` (${issue.foundPlayer})` : '' }}</span>
          — {{ issue.type }} image: {{ issue.issue }}
          <code>{{ issue.url }}</code>
        </li>
      </ul>
    </div>

    <div v-else-if="scanned" class="issues-panel issues-panel--clear">
      <h2>No image conversion issues detected</h2>
      <p>Queue images are webp as expected.</p>
    </div>
  </div>
</template>

<script setup name="AdminView">
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Loading from 'vue-loading-overlay'

import BikeTagButton from '@/components/BikeTagButton.vue'

const working = ref(false)
const scanned = ref(false)
const issues = ref([])
const lastAction = ref('')
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')

const getGameNameProper = computed(() => store.getGameNameProper)
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const issueCount = computed(() => issues.value.length)

async function scanQueue() {
  working.value = true
  lastAction.value = ''

  const result = await store.scanQueueIssues()
  working.value = false

  if (typeof result === 'string') {
    toast.open({
      message: result,
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }

  scanned.value = true
  issues.value = result.issues ?? []
  lastAction.value = result.issueCount
    ? `Scan complete: ${result.issueCount} conversion issue${result.issueCount === 1 ? '' : 's'} found.`
    : 'Scan complete: no failed webp conversions detected.'
}

async function fixQueue() {
  working.value = true
  lastAction.value = ''

  const result = await store.fixQueueIssues()
  working.value = false

  if (typeof result === 'string') {
    toast.open({
      message: result,
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return
  }

  scanned.value = true
  issues.value = result.issues ?? []
  lastAction.value = result.issueCount
    ? `Fix attempted, but ${result.issueCount} conversion issue${result.issueCount === 1 ? '' : 's'} remain.`
    : 'Queue images converted to webp successfully.'

  toast.open({
    message: lastAction.value,
    type: result.issueCount ? 'info' : 'success',
    duration: 10000,
    position: 'top',
  })
}

onMounted(async () => {
  await store.isReady()

  if (!isBikeTagAdmin.value) {
    router.push('/')
    return
  }

  await scanQueue()
})
</script>

<style scoped lang="scss">
.admin-page {
  background-color: #fff;
  color: #000;
  padding: 2rem;
  max-width: 760px;
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
    margin-bottom: 2rem;
  }

  .admin-icon {
    width: 72px;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .status-banner {
    border: 2px dashed #000;
    padding: 1rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .issues-panel {
    border: 2px dashed #000;
    padding: 1.5rem;
    text-align: left;

    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    code {
      display: block;
      margin-top: 0.5rem;
      word-break: break-all;
      font-size: 0.85rem;
    }

    &--clear {
      text-align: center;
    }
  }
}
</style>
