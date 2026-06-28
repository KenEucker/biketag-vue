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
      Scan the queue for image conversion problems, missing sized variants, wrong-round entries,
      and duplicate uploader splits. Use Fix Queue Images to re-run webp conversion and variant
      generation for fixable issues.
    </p>

    <div class="actions">
      <bike-tag-button variant="medium" text="Scan Queue" @click="scanQueue" />
      <bike-tag-button
        variant="medium-orange"
        text="Fix Queue Images"
        :disabled="!fixableIssueCount"
        @click="fixQueue"
      />
    </div>

    <div v-if="lastAction" class="status-banner">
      <p>{{ lastAction }}</p>
    </div>

    <div v-if="scanned" class="status-report">
      <h2>Queue Status</h2>
      <dl class="status-grid">
        <div>
          <dt>Current round</dt>
          <dd>#{{ report.currentRound ?? 'unknown' }}</dd>
        </div>
        <div>
          <dt>Expected queue round</dt>
          <dd>#{{ report.expectedQueueRound ?? 'unknown' }}</dd>
        </div>
        <div>
          <dt>Queue entries</dt>
          <dd>{{ report.queueCount ?? 0 }}</dd>
        </div>
        <div>
          <dt>Total issues</dt>
          <dd>{{ issueCount }}</dd>
        </div>
        <div>
          <dt>Fixable issues</dt>
          <dd>{{ fixableIssueCount }}</dd>
        </div>
      </dl>

      <ul class="summary-list">
        <li v-for="item in summaryItems" :key="item.key">
          <span class="summary-label">{{ item.label }}</span>
          <span :class="['summary-count', { 'summary-count--alert': item.count > 0 }]">
            {{ item.count }}
          </span>
        </li>
      </ul>
    </div>

    <div v-if="issues.length" class="issues-panel">
      <h2>{{ issueCount }} issue{{ issueCount === 1 ? '' : 's' }} found</h2>

      <section v-for="section in issueSections" :key="section.key" class="issue-section">
        <h3>{{ section.label }} ({{ section.issues.length }})</h3>
        <ul>
          <li
            v-for="(issue, index) in section.issues"
            :key="`${issue.category}-${issue.tagnumber}-${issue.type ?? 'none'}-${index}`"
          >
            <strong>Tag #{{ issue.tagnumber }}</strong>
            <span v-if="issue.player"> ({{ issue.player }})</span>
            <span v-if="issue.type"> — {{ issue.type }} image</span>
            <span v-if="issue.relatedTagnumbers?.length">
              — rounds #{{ issue.relatedTagnumbers.join(', #') }}
            </span>
            : {{ issue.issue }}
            <code v-if="issue.url">{{ issue.url }}</code>
          </li>
        </ul>
      </section>
    </div>

    <div v-else-if="scanned" class="issues-panel issues-panel--clear">
      <h2>No queue issues detected</h2>
      <p>Queue images, variants, rounds, and uploader groupings look correct.</p>
    </div>
  </div>
</template>

<script setup name="AdminView">
import { useBikeTagStore } from '@/store/index'
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Loading from 'vue-loading-overlay'

import BikeTagButton from '@/components/BikeTagButton.vue'

const ISSUE_SECTIONS = [
  { key: 'non-webp', label: 'Non-webp images' },
  { key: 'missing-variants', label: 'Missing medium/small variants' },
  { key: 'wrong-round', label: 'Wrong round' },
  { key: 'duplicate-uploader', label: 'Duplicate uploader split' },
]

const working = ref(false)
const scanned = ref(false)
const issues = ref([])
const report = ref({})
const lastAction = ref('')
const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')

const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const issueCount = computed(() => issues.value.length)
const fixableIssueCount = computed(() => report.value.fixableIssueCount ?? 0)

const summaryItems = computed(() =>
  ISSUE_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    count: report.value.summary?.[section.key] ?? 0,
  })),
)

const issueSections = computed(() =>
  ISSUE_SECTIONS.map((section) => ({
    ...section,
    issues: issues.value.filter((issue) => issue.category === section.key),
  })).filter((section) => section.issues.length),
)

function applyScanResult(result) {
  scanned.value = true
  issues.value = result.issues ?? []
  report.value = {
    currentRound: result.currentRound,
    expectedQueueRound: result.expectedQueueRound,
    queueCount: result.queueCount,
    fixableIssueCount: result.fixableIssueCount ?? 0,
    summary: result.summary ?? {},
  }
}

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

  applyScanResult(result)
  lastAction.value = result.issueCount
    ? `Scan complete: ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} found (${result.fixableIssueCount ?? 0} fixable).`
    : 'Scan complete: no queue issues detected.'
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

  applyScanResult(result)
  lastAction.value = result.issueCount
    ? `Fix attempted, but ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} remain (${result.fixableIssueCount ?? 0} fixable).`
    : 'Queue images converted and variants generated successfully.'

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

  .status-banner,
  .status-report,
  .issues-panel {
    border: 2px dashed #000;
    padding: 1.5rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .status-report {
    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      text-align: center;
    }
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin: 0 0 1.5rem;

    div {
      border: 1px solid #000;
      padding: 0.75rem;
    }

    dt {
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
    }

    dd {
      margin: 0;
      font-size: 1.1rem;
      font-weight: bold;
    }
  }

  .summary-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-top: 1px dashed #000;
    }
  }

  .summary-count {
    font-weight: bold;

    &--alert {
      color: #c0392b;
    }
  }

  .issues-panel {
    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      text-align: center;
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

  .issue-section {
    margin-bottom: 1.5rem;

    h3 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #000;
      padding-bottom: 0.35rem;
    }
  }
}
</style>
