<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <loading v-show="working" v-model:active="working" :is-full-page="true" class="realign-spinner">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>

  <div class="admin-page container">
    <img class="admin-icon" src="/images/biketag-ambassador.svg" alt="Admin Icon" />
    <h1>BikeTag Admin</h1>
    <p>
      Scan the queue for image conversion problems, missing sized variants, wrong-round entries,
      orphaned found images that never made it to main, and duplicate uploader splits. Use Fix Queue
      Images to re-run webp conversion and variant generation for fixable issues. Wrong-round files
      can be deleted individually or in bulk. Orphaned found images can be moved into main/.
    </p>

    <div class="actions">
      <bike-tag-button variant="medium" text="Scan Queue" @click="scanQueue" />
      <bike-tag-button
        variant="medium-orange"
        text="Fix Queue Images"
        :disabled="!fixableIssueCount"
        @click="fixQueue"
      />
      <bike-tag-button
        variant="medium-orange"
        text="Delete All Wrong-Round Files"
        :disabled="!deletableIssueCount"
        @click="deleteAllWrongRound"
      />
      <bike-tag-button
        variant="medium-orange"
        text="Resend Post Notifications"
        :disabled="working"
        @click="resendPostNotifications"
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
          <dt>Queue folder files</dt>
          <dd>{{ report.storageFileCount ?? 0 }}</dd>
        </div>
        <div>
          <dt>Simulated queue entries</dt>
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
        <div>
          <dt>Deletable issues</dt>
          <dd>{{ deletableIssueCount }}</dd>
        </div>
        <div>
          <dt>Repairable issues</dt>
          <dd>{{ repairableIssueCount }}</dd>
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
            :class="{ 'issue-item--orphaned': issue.comparePreview }"
          >
            <strong>Tag #{{ issue.tagnumber }}</strong>
            <span v-if="issue.player"> ({{ issue.player }})</span>
            <span v-if="issue.type"> — {{ issue.type }} image</span>
            <span v-if="issue.relatedTagnumbers?.length">
              — rounds #{{ issue.relatedTagnumbers.join(', #') }}
            </span>
            : {{ issue.issue }}
            <code v-if="issue.url && !issue.comparePreview">{{ issue.url }}</code>
            <div v-if="issue.comparePreview" class="orphan-compare">
              <figure>
                <img
                  :src="previewUrl(issue.comparePreview.mysteryImageUrl)"
                  :alt="`Tag #${issue.tagnumber} mystery in main`"
                  loading="lazy"
                />
                <figcaption>
                  Tag #{{ issue.tagnumber }} mystery (main)
                  <span class="orphan-compare__note">
                    — the photo that was hidden for this tag
                  </span>
                </figcaption>
              </figure>
              <figure>
                <img
                  :src="previewUrl(issue.comparePreview.candidateFoundUrl)"
                  :alt="`Queue found candidate for tag #${issue.tagnumber}`"
                  loading="lazy"
                />
                <figcaption>
                  Queue found candidate
                  <span v-if="filenameRoundFromKey(issue.key) !== issue.tagnumber">
                    — filename #{{ filenameRoundFromKey(issue.key) }}, metadata #{{
                      issue.metadataTagnumber ?? 'unknown'
                    }}, belongs on #{{ issue.tagnumber }}
                  </span>
                  <span v-else-if="issue.comparePreview.queueFoundPlayer">
                    — {{ issue.comparePreview.queueFoundPlayer }}
                  </span>
                  <span v-if="issue.comparePreview.playerConflict" class="orphan-compare__warn">
                    Player conflicts with expected finder
                    {{
                      issue.comparePreview.expectedFoundPlayer
                        ? ` (${issue.comparePreview.expectedFoundPlayer})`
                        : ''
                    }}
                  </span>
                  <span
                    v-else-if="!issue.comparePreview.playerVerified"
                    class="orphan-compare__note"
                  >
                    Player not verified from metadata — compare visually
                  </span>
                </figcaption>
              </figure>
            </div>
            <button
              v-if="issue.repairable && issue.category === 'orphaned-main-found'"
              type="button"
              class="issue-action issue-action--repair"
              @click="moveToMain(issue)"
            >
              Move to main
            </button>
            <span
              v-else-if="issue.comparePreview?.playerConflict"
              class="issue-action issue-action--blocked"
            >
              Move blocked — player mismatch
            </span>
            <button
              v-if="issue.deletable"
              type="button"
              class="issue-action issue-action--delete"
              @click="deleteIssue(issue)"
            >
              Delete file
            </button>
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
import { getS3ImageSized } from '@/common/methods'
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Loading from 'vue-loading-overlay'

import BikeTagButton from '@/components/BikeTagButton.vue'

const ISSUE_SECTIONS = [
  { key: 'non-webp', label: 'Non-webp images' },
  { key: 'missing-variants', label: 'Missing medium/small variants' },
  { key: 'orphaned-main-found', label: 'Orphaned found (not in main)' },
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
const deletableIssueCount = computed(() => report.value.deletableIssueCount ?? 0)
const repairableIssueCount = computed(() => report.value.repairableIssueCount ?? 0)

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

function previewUrl(url) {
  return getS3ImageSized(url, 'medium')
}

function filenameRoundFromKey(key) {
  const match = key?.match(/-tag-(\d+)--found/i)
  return match ? Number(match[1]) : undefined
}

function applyScanResult(result) {
  scanned.value = true
  issues.value = result.issues ?? []
  report.value = {
    currentRound: result.currentRound,
    expectedQueueRound: result.expectedQueueRound,
    queueCount: result.queueCount,
    storageFileCount: result.storageFileCount,
    storageBucket: result.storageBucket,
    fixableIssueCount: result.fixableIssueCount ?? 0,
    deletableIssueCount: result.deletableIssueCount ?? 0,
    repairableIssueCount: result.repairableIssueCount ?? 0,
    summary: result.summary ?? {},
  }
}

async function runQueueAction(action) {
  working.value = true
  lastAction.value = ''

  const result = await action()
  working.value = false

  if (typeof result === 'string') {
    toast.open({
      message: result,
      type: 'error',
      duration: 10000,
      position: 'top',
    })
    return null
  }

  applyScanResult(result)
  return result
}

function notifyAction(message, hasRemainingIssues = false) {
  lastAction.value = message
  toast.open({
    message,
    type: hasRemainingIssues ? 'info' : 'success',
    duration: 10000,
    position: 'top',
  })
}

// Queue-fix admin actions — all call POST/GET /api/queue-fix (see functions/queue-fix.mts).
async function scanQueue() {
  const result = await runQueueAction(() => store.scanQueueIssues())
  if (!result) return

  lastAction.value = result.issueCount
    ? `Scan complete: ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} found (${result.fixableIssueCount ?? 0} fixable, ${result.deletableIssueCount ?? 0} deletable).`
    : 'Scan complete: no queue issues detected.'
}

async function fixQueue() {
  const result = await runQueueAction(() => store.fixQueueIssues())
  if (!result) return

  notifyAction(
    result.issueCount
      ? `Fix attempted, but ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} remain (${result.fixableIssueCount ?? 0} fixable).`
      : 'Queue images converted and variants generated successfully.',
    !!result.issueCount,
  )
}

async function moveToMain(issue) {
  const label = issue.key?.split('/').pop() ?? 'queue found image'
  const result = await runQueueAction(() => store.moveQueueFoundToMain(issue))
  if (!result) return

  notifyAction(
    result.issueCount
      ? `Moved ${label} to main/, but ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} remain.`
      : `Moved ${label} to main/ and updated the main index.`,
    !!result.issueCount,
  )
}

async function deleteIssue(issue) {
  const deletedLabel = issue.key?.split('/').pop() ?? 'queue file'
  if (!window.confirm(`Delete ${deletedLabel}?`)) {
    return
  }

  const result = await runQueueAction(() => store.deleteQueueIssue(issue))
  if (!result) return

  notifyAction(
    result.issueCount
      ? `Deleted ${deletedLabel}, but ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} remain.`
      : `Deleted ${deletedLabel}.`,
    !!result.issueCount,
  )
}

async function deleteAllWrongRound() {
  if (!window.confirm('Delete all wrong-round queue files?')) {
    return
  }

  const result = await runQueueAction(() => store.deleteWrongRoundQueueFiles())
  if (!result) return

  notifyAction(
    result.issueCount
      ? `Deleted wrong-round files, but ${result.issueCount} issue${result.issueCount === 1 ? '' : 's'} remain.`
      : 'Wrong-round queue files deleted successfully.',
    !!result.issueCount,
  )
}

async function resendPostNotifications() {
  if (!window.confirm('Resend notifications for the most recently created BikeTag post?')) {
    return
  }

  working.value = true
  lastAction.value = ''

  const result = await store.resendLatestPostNotifications()
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

  const completedCount = Array.isArray(result) ? result.filter(Boolean).length : 0
  const message = completedCount
    ? `Post notifications resent: ${completedCount} notification task${completedCount === 1 ? '' : 's'} completed.`
    : 'Post notification resend completed.'

  notifyAction(message)
}

onMounted(async () => {
  await store.isReady()

  if (!isBikeTagAdmin.value) {
    router.push('/')
  }
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
    max-width: 60vw;
    margin: 0 auto 2rem;
    padding: 2em;
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

    .issue-action {
      display: inline-block;
      margin-top: 0.5rem;
      margin-right: 0.5rem;
      padding: 0.35rem 0.75rem;
      border: 1px solid #000;
      background: #fff;
      font-family: inherit;
      font-size: 0.85rem;
      cursor: pointer;

      &:hover {
        background: #f5f5f5;
      }

      &--repair {
        background: #e8f5e9;
      }

      &--blocked {
        display: inline-block;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: #c0392b;
      }
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

  .issue-item--orphaned {
    padding-bottom: 1rem;
    border-bottom: 1px dashed #ccc;
  }

  .orphan-compare {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;

    figure {
      flex: 1 1 220px;
      margin: 0;
      text-align: center;

      img {
        display: block;
        width: 100%;
        max-height: 280px;
        object-fit: contain;
        border: 1px solid #000;
        background: #f5f5f5;
      }

      figcaption {
        font-size: 0.85rem;
        margin-top: 0.35rem;
        line-height: 1.35;
      }
    }

    &__warn {
      display: block;
      color: #c0392b;
      margin-top: 0.25rem;
    }

    &__note {
      display: block;
      color: #666;
      margin-top: 0.25rem;
    }
  }
}
</style>
