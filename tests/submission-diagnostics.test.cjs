const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function compile(source, filename) {
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  )
  return loaded.exports
}
const filename = path.resolve('src/common/submission-diagnostics.ts')
const loadDiagnostics = () => compile(fs.readFileSync(filename, 'utf8'), filename)
const diagnostics = loadDiagnostics()
const { getSubmissionContext, observeSubmissionStage } = diagnostics
const context = (extra = {}) =>
  getSubmissionContext({
    game: 'portland',
    action: 'addFoundTag',
    tag: { tagnumber: 42, foundPlayer: 'Rider' },
    playerId: 'player-42',
    currentTag: { tagnumber: 42, mysteryPlayer: 'Previous rider' },
    ...extra,
  })
const storage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    values,
  }
}

test('first found upload uses submitted identity and round even before a queued tag exists', () => {
  const fields = context({
    queuedTag: {},
    tag: {
      tagnumber: 42,
      foundPlayer: 'Rider',
      foundImage: {
        name: 'photo.jpg',
        size: 2048,
        type: 'image/jpeg',
        lastModified: 1234,
        bytes: 'PRIVATE_IMAGE_BYTES',
      },
      passcode: 'PRIVATE_PASSCODE',
      gps: { lat: 45, long: -122 },
    },
  })
  assert.equal(fields.submission, 'portland-42--Rider')
  assert.equal(fields.playerId, 'player-42')
  const detail = JSON.parse(fields.context)
  assert.equal(detail.currentMysteryPlayer, 'Previous rider')
  assert.deepEqual(detail.foundImage, {
    name: 'photo.jpg',
    size: 2048,
    type: 'image/jpeg',
    lastModified: 1234,
  })
  assert.doesNotMatch(JSON.stringify(fields), /PRIVATE|gps/)
  const missing = context({ tag: {}, currentTag: {}, playerId: '', queuedTag: {} })
  assert.equal(missing.submission, 'portland-unknown-round--unknown-player')
  assert.doesNotMatch(missing.submission, /undefined|NaN/)
})

test('stages retain SDK status, returned failures and thrown browser errors without serializing HTTP credentials', async () => {
  const trail = []
  const record = (stage, details) => trail.push({ stage, ...details })
  const response = {
    success: false,
    error: 'player created previous round',
    status: 409,
    source: 'aws',
    data: { token: 'PRIVATE' },
  }
  assert.equal(
    await observeSubmissionStage('found:queue-tag', async () => response, record),
    response,
  )
  assert.equal(trail[1].status, 409)
  assert.equal(trail[1].error.message, response.error)
  const error = Object.assign(new Error('Network Error'), {
    code: 'ERR_NETWORK',
    config: { authorization: 'PRIVATE' },
  })
  await assert.rejects(
    observeSubmissionStage(
      'upload',
      async () => {
        throw error
      },
      record,
    ),
    error,
  )
  assert.equal(trail.at(-1).error.code, 'ERR_NETWORK')
  assert.doesNotMatch(JSON.stringify(trail), /PRIVATE|authorization/)
  assert.equal(
    await observeSubmissionStage(
      'upload',
      async () => true,
      () => {
        throw new Error('logger broken')
      },
    ),
    true,
  )
})

test('a failed upload, notice dismissal, reload, retry failure and eventual success share a reference', async () => {
  const saved = storage()
  const reports = []
  const send = async (fields) => reports.push(fields)
  const first = loadDiagnostics().createSubmissionAttempt(context(), send, saved)
  await first.started()
  assert.equal(reports.length, 0)
  await first.failed(new Error('Network Error'), 'found:queue-tag')
  await first.dismissed()
  const retry = loadDiagnostics().createSubmissionAttempt(context(), send, saved)
  await retry.started()
  await retry.failed('File could not be read', 'found:queue-tag')
  const third = loadDiagnostics().createSubmissionAttempt(context(), send, saved)
  await third.started()
  await third.succeeded()
  assert.deepEqual(
    reports.map((r) => r.event),
    ['error', 'error-dismissed', 'retry-started', 'error', 'retry-started', 'retry-succeeded'],
  )
  assert.equal(new Set(reports.map((r) => r.correlationId)).size, 1)
  assert.equal(reports[2].previousAttemptId, reports[0].attemptId)
  assert.equal(reports[4].previousAttemptId, reports[3].attemptId)
  assert.notEqual(reports[2].attemptId, reports[0].attemptId)
  assert.equal(reports.at(-1).attemptNumber, '3')
  const afterSuccess = loadDiagnostics().createSubmissionAttempt(context(), send, saved)
  await afterSuccess.started()
  await afterSuccess.succeeded()
  assert.equal(reports.length, 6)
})

test('blocked retries are observable and different players, actions and rounds do not inherit failures', async () => {
  const saved = storage()
  const reports = []
  const create = (fields) =>
    loadDiagnostics().createSubmissionAttempt(fields, async (r) => reports.push(r), saved)
  await create(context()).failed('Network Error', 'upload')
  const retry = create(context())
  await retry.started()
  await retry.blocked('Upload delay is still active')
  assert.equal(reports.at(-1).event, 'retry-blocked')
  for (const fields of [
    context({ playerId: 'other' }),
    context({ action: 'addMysteryTag' }),
    context({ tag: { tagnumber: 43, foundPlayer: 'Rider' } }),
  ]) {
    assert.equal(create(fields).retrying, false)
  }
  for (const [key, value] of saved.values)
    saved.values.set(
      key,
      JSON.stringify({ ...JSON.parse(value), updatedAt: Date.now() - 25 * 60 * 60 * 1000 }),
    )
  assert.equal(create(context()).retrying, false)
})

test('storage denial falls back to memory and telemetry delivery failure never rejects the upload flow', async (t) => {
  t.mock.method(console, 'warn', () => {})
  const unavailable = {
    getItem() {
      throw new Error('denied')
    },
    setItem() {
      throw new Error('denied')
    },
  }
  const create = (send) =>
    diagnostics.createSubmissionAttempt(context({ game: 'storage-denied' }), send, unavailable)
  await assert.doesNotReject(
    create(async () => {
      throw new Error('offline')
    }).failed('Network Error', 'upload'),
  )
  const reports = []
  const retry = create(async (r) => reports.push(r))
  assert.equal(retry.retrying, true)
  await retry.started()
  assert.equal(reports[0].event, 'retry-started')
})

function playHarness({ result = 'Network Error', ipError, notifyError } = {}) {
  const reports = [],
    notices = [],
    calls = []
  const createSubmissionAttempt = loadDiagnostics().createSubmissionAttempt
  const source = fs.readFileSync('src/views/Play.vue', 'utf8')
  const handler = source.slice(
    source.indexOf('async function onQueueSubmit('),
    source.indexOf('// created'),
  )
  const uploadInProgress = { value: false }
  const getPlayerTag = { value: {} }
  const deps = {
    createSubmissionAttempt,
    getSubmissionContext,
    observeSubmissionStage,
    uploadInProgress,
    getGameName: { value: 'portland' },
    getPlayerTag,
    getCurrentBikeTag: { value: { tagnumber: 42, mysteryPlayer: 'Previous' } },
    getPlayerId: { value: 'player-42' },
    getPlayerName: { value: 'Profile name' },
    getFormStep: { value: 'addFoundImage' },
    getGame: { value: { settings: {} } },
    getProfile: { value: {} },
    getGameNotices: { value: {} },
    queueError: { value: null }, // No DOM form is available during this first upload.
    sendNetlifyError: async (message, _form, fields) => reports.push({ message, ...fields }),
    sendNetlifyForm: async () => {
      calls.push('notify')
      if (notifyError) throw notifyError
      return new Response()
    },
    publicIp: async () => {
      if (ipError) throw ipError
      return '192.0.2.1'
    },
    getIPIsBanned: async () => false,
    getPlayerIsBanned: async () => false,
    localStorage: storage(),
    window: { sessionStorage: storage(), scrollTo() {} },
    history: {},
    debug() {},
    summarizeTagGps() {},
    t: (key) => key,
    toast: { open: (options) => notices.push(options) },
    store: {
      getImageSource: 'aws',
      addFoundTag: async () => {
        calls.push('upload')
        return result
      },
      fetchCredentials: async () => {},
      fetchTags: async () => {
        calls.push('refresh-tags')
      },
      fetchQueuedTags: async () => {
        calls.push('refresh-queue')
      },
    },
  }
  const submit = new Function(...Object.keys(deps), handler + '\nreturn onQueueSubmit')(
    ...Object.values(deps),
  )
  const submission = {
    tag: { tagnumber: 42, foundPlayer: 'Rider', foundImage: { size: 99, type: 'image/jpeg' } },
    formAction: 'add-found-tag',
    formData: new FormData(),
    storeAction: 'addFoundTag',
  }
  return {
    submit: () => submit(submission),
    reports,
    notices,
    calls,
    uploadInProgress,
    store: deps.store,
  }
}

test('Play reports a first-upload rejection with identity, round and explicit dismissal even without the form', async () => {
  const flow = playHarness()
  await flow.submit()
  assert.equal(flow.uploadInProgress.value, false)
  assert.equal(flow.reports[0].playerId, 'player-42')
  assert.equal(flow.reports[0].submission, 'portland-42--Rider')
  assert.equal(flow.reports[0].ip, '192.0.2.1')
  assert.equal(flow.reports[0].event, 'error')
  assert.equal(flow.reports.length, 1) // Timeout alone does not imply dismissal.
  flow.notices.at(-1).onClick()
  assert.equal(flow.reports.at(-1).event, 'error-dismissed')
  await flow.submit()
  assert.deepEqual(
    flow.reports.slice(-2).map((r) => r.event),
    ['retry-started', 'error'],
  )
})

test('Play catches public-IP and post-upload notification failures and always releases the spinner', async () => {
  const preflight = playHarness({ ipError: new Error('IP lookup failed') })
  await preflight.submit()
  assert.equal(preflight.reports[0].stage, 'public-ip')
  assert.equal(preflight.calls.length, 0)
  assert.equal(preflight.uploadInProgress.value, false)
  const notification = playHarness({ result: true, notifyError: new Error('HTTP 503') })
  await notification.submit()
  assert.deepEqual(notification.calls, ['upload', 'refresh-tags', 'refresh-queue', 'notify'])
  assert.equal(notification.reports[0].stage, 'notify-submission')
  assert.equal(notification.uploadInProgress.value, false)
})

test('Netlify helpers reject HTTP failures and retain explicit diagnostic fields without a DOM form', async (t) => {
  const source = fs.readFileSync('src/common/methods.ts', 'utf8')
  const helpers = compile(
    source.slice(
      source.indexOf('export const sendNetlifyError'),
      source.indexOf('export const GetQueryString'),
    ),
    path.resolve('src/common/test-netlify.ts'),
  )
  let sent
  t.mock.method(globalThis, 'fetch', async (_action, options) => {
    sent = options
    return new Response('', { status: 503 })
  })
  await assert.rejects(
    helpers.sendNetlifyError('Network Error', null, {
      playerId: 'player-42',
      submission: 'portland-42--Rider',
      diagnostics: '{"online":false}',
    }),
    /HTTP 503/,
  )
  const params = new URLSearchParams(sent.body)
  assert.equal(params.get('playerId'), 'player-42')
  assert.equal(params.get('diagnostics'), '{"online":false}')
  assert.equal(sent.keepalive, true)
  let successCalled = false
  let reported
  await helpers.sendNetlifyForm(
    'add-found-tag',
    '',
    () => {
      successCalled = true
    },
    (error) => {
      reported = error
    },
  )
  assert.equal(successCalled, false)
  assert.match(reported.message, /HTTP 503/)
})

test('Play emits a recovery report only after a retry succeeds and suppresses duplicate submit clicks', async () => {
  const flow = playHarness()
  await flow.submit()
  flow.store.addFoundTag = async () => {
    flow.calls.push('upload')
    return true
  }
  await Promise.all([flow.submit(), flow.submit()])
  assert.deepEqual(
    flow.reports.map((r) => r.event),
    ['error', 'retry-started', 'retry-succeeded'],
  )
  assert.equal(flow.calls.filter((c) => c === 'upload').length, 2)
  assert.equal(flow.uploadInProgress.value, false)
  const normal = playHarness({ result: true })
  await normal.submit()
  assert.equal(normal.reports.length, 0)
})

test('Netlify deploy-time form declares every field carried by submission diagnostics', async () => {
  const html = fs.readFileSync('index.html', 'utf8')
  const form = html.match(/<form name="post-tag-error"[\s\S]*?<\/form>/)[0]
  const declared = [...form.matchAll(/name="([^"]+)"/g)].map((m) => m[1])
  const reports = []
  const attempt = loadDiagnostics().createSubmissionAttempt(
    { ...context(), ip: '192.0.2.1' },
    async (r) => reports.push(r),
  )
  await attempt.failed('Network Error', 'found:queue-tag')
  for (const field of Object.keys(reports[0]))
    assert.ok(declared.includes(field), `Undeclared Netlify field: ${field}`)
})
