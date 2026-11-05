const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { AxiosHeaders } = require('axios')
const BikeTagClient = require('biketag').BikeTagClient

function load(file, dependencies = {}) {
  const filename = path.resolve(file)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = loaded.require.bind(loaded)
  loaded.require = (name) => dependencies[name] ?? originalRequire(name)
  loaded._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  )
  return loaded.exports
}

const diagnostics = load('src/common/submission-diagnostics.ts')
const loadRecovery = (dependencies = {}) =>
  load('src/common/upload-recovery.ts', {
    './submission-diagnostics': diagnostics,
    ...dependencies,
  })
const { uploadWithRecovery, UPLOAD_POLICY } = loadRecovery()
const destination = 'https://demo-biketag.sfo2.digitaloceanspaces.com/queue/photo.jpg'
const request = () => ({
  method: 'put',
  url: destination + '?X-Amz-Signature=PRIVATE_SIGNATURE',
  headers: new AxiosHeaders({
    'Content-Type': 'image/jpeg',
    'x-amz-meta-data': 'PRIVATE_METADATA',
  }),
  data: new Uint8Array([1, 2, 3]).buffer,
})
const response = (config) => ({ status: 200, statusText: 'OK', data: '', headers: {}, config })
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })
const progress = (loaded, total = 100) => ({ loaded, total, bytes: loaded, lengthComputable: true })
const trail = () => {
  const events = []
  return { events, record: (stage, detail) => events.push({ stage, ...detail }) }
}
function visibility(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const active = new Set()
  const add = document.addEventListener.bind(document)
  const remove = document.removeEventListener.bind(document)
  document.addEventListener = (name, listener) => {
    active.add(listener)
    add(name, listener)
  }
  document.removeEventListener = (name, listener) => {
    active.delete(listener)
    remove(name, listener)
  }
  globalThis.document = document
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else delete globalThis.document
  })
  return {
    active,
    change(state) {
      document.visibilityState = state
      document.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

test('a stalled transfer is aborted before one retry with fresh signing and the identical object body', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  const page = visibility(t)
  const calls = []
  const log = trail()
  let signingCalls = 0
  const config = request()
  const result = uploadWithRecovery(
    (config) => {
      calls.push(config)
      if (calls.length === 2) return Promise.resolve(response(config))
      return new Promise((_resolve, reject) =>
        config.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' })),
        ),
      )
    },
    config,
    async () => {
      assert.equal(calls[0].signal.aborted, true)
      signingCalls++
      return destination + '?X-Amz-Signature=PRIVATE_RENEWED'
    },
    log.record,
  )
  t.mock.timers.tick(UPLOAD_POLICY.idleMs)
  assert.equal((await result).status, 200)
  assert.equal(calls.length, 2)
  assert.equal(signingCalls, 1)
  assert.equal(calls[0].data, config.data)
  assert.equal(calls[1].data, config.data)
  assert.equal(calls[0].headers, calls[1].headers)
  assert.equal(calls[1].url, destination + '?X-Amz-Signature=PRIVATE_RENEWED')
  assert.equal(log.events.find((e) => e.event === 'failed').error.code, 'UPLOAD_STALLED')
  assert.equal(page.active.size, 0)
  assert.doesNotMatch(JSON.stringify(log.events), /PRIVATE|photo\.jpg/)
  const count = log.events.length
  t.mock.timers.tick(10 * UPLOAD_POLICY.timeoutMs)
  assert.equal(log.events.length, count)
})

test('progress extends the idle deadline but an absolute timeout still aborts an active transfer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  let transfer
  const result = uploadWithRecovery(
    (config) => {
      transfer = config
      return new Promise(() => {})
    },
    request(),
    async () => assert.fail('No retry allowed'),
    undefined,
    { ...UPLOAD_POLICY, maxAttempts: 1 },
  )
  const rejected = assert.rejects(result, { code: 'UPLOAD_TIMEOUT' })
  for (let i = 1; i <= 4; i++) {
    t.mock.timers.tick(40_000)
    transfer.onUploadProgress(progress(i))
    assert.equal(transfer.signal.aborted, false)
  }
  t.mock.timers.tick(20_000)
  await rejected
  assert.equal(transfer.signal.aborted, true)
})

test('unchanged progress and waiting for a response after 100 percent do not keep a stalled request alive', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  for (const loaded of [10, 100]) {
    let transfer
    const result = uploadWithRecovery(
      (config) => {
        transfer = config
        return new Promise(() => {})
      },
      request(),
      async () => assert.fail('No retry allowed'),
      undefined,
      { ...UPLOAD_POLICY, maxAttempts: 1 },
    )
    const rejected = assert.rejects(result, { code: 'UPLOAD_STALLED' })
    transfer.onUploadProgress(progress(loaded))
    t.mock.timers.tick(44_000)
    transfer.onUploadProgress(progress(loaded))
    t.mock.timers.tick(1000)
    await rejected
  }
})

test('visibility changes detect expired deadlines even if browser timers did not run', async (t) => {
  const page = visibility(t)
  let now = 1000
  t.mock.method(Date, 'now', () => now)
  let transfer
  const log = trail()
  const result = uploadWithRecovery(
    (config) => {
      transfer = config
      return new Promise(() => {})
    },
    request(),
    async () => assert.fail('No retry allowed'),
    log.record,
    { ...UPLOAD_POLICY, maxAttempts: 1 },
  )
  const rejected = assert.rejects(result, { code: 'UPLOAD_TIMEOUT' })
  page.change('hidden')
  now += UPLOAD_POLICY.timeoutMs + 1
  page.change('visible')
  await rejected
  assert.equal(transfer.signal.aborted, true)
  assert.equal(page.active.size, 0)
  assert.ok(log.events.at(-1).durationMs > UPLOAD_POLICY.timeoutMs)
})

test('network recovery is bounded and definitive HTTP errors do not trigger retries', async () => {
  for (const status of [undefined, 403]) {
    const log = trail()
    let calls = 0
    let renewals = 0
    const failure = status
      ? Object.assign(new Error('Access denied'), {
          code: 'ERR_BAD_REQUEST',
          config: { private: 'PRIVATE_CONFIG' },
          response: { status, data: 'PRIVATE_RESPONSE', headers: { private: 'PRIVATE_HEADER' } },
        })
      : networkError()
    await assert.rejects(
      uploadWithRecovery(
        async () => {
          calls++
          throw failure
        },
        request(),
        async () => {
          renewals++
          return destination + '?X-Amz-Signature=PRIVATE_RENEWED'
        },
        log.record,
      ),
      failure,
    )
    assert.equal(calls, status ? 1 : 2)
    assert.equal(renewals, status ? 0 : 1)
    if (status) assert.equal(log.events.at(-1).error.status, 403)
    assert.doesNotMatch(JSON.stringify(log.events), /PRIVATE/)
  }
})

test('a retry cannot send the body to a changed key or host', async () => {
  for (const fresh of [destination + '-changed', destination.replace('demo-biketag', 'other')]) {
    let calls = 0
    await assert.rejects(
      uploadWithRecovery(
        async () => {
          calls++
          throw networkError()
        },
        request(),
        async () => fresh,
      ),
      { code: 'UPLOAD_DESTINATION' },
    )
    assert.equal(calls, 1)
  }
})

test('external cancellation aborts without retrying or retaining visibility listeners', async (t) => {
  const page = visibility(t)
  const controller = new AbortController()
  let transfer
  const result = uploadWithRecovery(
    (config) => {
      transfer = config
      return new Promise(() => {})
    },
    { ...request(), signal: controller.signal },
    async () => assert.fail('Cancellation must not retry'),
  )
  const rejected = assert.rejects(result, { code: 'ERR_CANCELED' })
  controller.abort()
  await rejected
  assert.equal(transfer.signal.aborted, true)
  assert.equal(page.active.size, 0)
})

test('successful progress is throttled, does not renew signing, and diagnostics cannot break uploading', async () => {
  const log = trail()
  const result = await uploadWithRecovery(
    async (config) => {
      for (let i = 1; i <= 100; i++) config.onUploadProgress(progress(i))
      config.onUploadProgress(progress(100))
      return response(config)
    },
    request(),
    async () => assert.fail('Successful upload must not renew signing'),
    log.record,
  )
  assert.equal(result.status, 200)
  assert.equal(log.events.filter((e) => e.event === 'progress').length, 2)
  assert.equal(log.events.at(-1).loaded, 100)
  assert.doesNotMatch(JSON.stringify(log.events), /PRIVATE/)
  await assert.doesNotReject(
    uploadWithRecovery(
      async (config) => response(config),
      request(),
      async () => '',
      () => {
        throw new Error('Logger failed')
      },
    ),
  )
})

test('late progress callbacks cannot restart timers or diagnostics after completion', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
  const page = visibility(t)
  const log = trail()
  let transfer
  await uploadWithRecovery(
    async (config) => {
      transfer = config
      return response(config)
    },
    request(),
    async () => assert.fail('Completed uploads must not retry'),
    log.record,
  )
  const count = log.events.length
  transfer.onUploadProgress(progress(100))
  t.mock.timers.tick(UPLOAD_POLICY.timeoutMs * 2)
  assert.equal(log.events.length, count)
  assert.equal(transfer.signal.aborted, false)
  assert.equal(page.active.size, 0)
})

test('a failed signature renewal stops recovery without another transfer', async () => {
  const log = trail()
  let calls = 0
  await assert.rejects(
    uploadWithRecovery(
      async () => {
        calls++
        throw networkError()
      },
      request(),
      async () => {
        throw new Error('Signing unavailable')
      },
      log.record,
    ),
    /Signing unavailable/,
  )
  assert.equal(calls, 1)
  assert.equal(log.events.filter((e) => e.event === 'retrying').length, 1)
})

test('the actual SDK retries only PUT with a fresh URL and preserves both found and mystery files', async (t) => {
  const previousWindow = globalThis.window
  globalThis.window = {}
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  })
  for (const slot of ['found', 'mystery']) {
    const puts = []
    const signs = []
    const reads = []
    const clients = []
    let failAlways = false
    class TestSDK extends BikeTagClient {
      constructor(config) {
        super(config)
        clients.push(this)
        this.awsClient.send = async (command) => {
          reads.push(command.input.Key)
          assert.equal(command.constructor.name, 'GetObjectCommand')
          const data =
            command.input.Key === 'queue/index.json'
              ? []
              : [{ tagnumber: 42, mysteryPlayer: 'Previous rider' }]
          return { Body: new Blob([JSON.stringify(data)]).stream() }
        }
        this.fetcher.defaults.adapter = async (config) => {
          const payload = JSON.parse(config.data)
          signs.push(payload)
          assert.equal(config.timeout, UPLOAD_POLICY.signingTimeoutMs)
          return {
            ...response(config),
            data: `https://demo-biketag.sfo2.digitaloceanspaces.com/${payload.key}?signature=PRIVATE_${signs.length}`,
          }
        }
        this.plainFetcher.defaults.adapter = async (config) => {
          puts.push(config)
          config.onUploadProgress(progress(config.data.byteLength, config.data.byteLength))
          if (puts.length === 1 || failAlways) throw networkError()
          return response(config)
        }
      }
    }
    const sdk = new TestSDK({
      game: 'demo',
      host: 'https://demo.biketag.org/api',
      clientToken: `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`,
      aws: { region: 'sfo2', accessKeyId: 'dummy', secretAccessKey: 'dummy' },
    })
    const originalAdapter = sdk.plainFetcher.defaults.adapter
    const originalFile = new File(['IMAGE_BYTES'], 'photo.jpeg', { type: 'image/jpeg' })
    const payload = {
      game: 'demo',
      playerId: 'player-42',
      tagnumber: 42,
      foundPlayer: 'Rider',
      mysteryPlayer: slot === 'mystery' ? 'Rider' : '',
      [slot + 'Image']: originalFile,
    }
    const log = trail()
    const reports = []
    const attempt = diagnostics.createSubmissionAttempt(
      { game: 'demo', action: slot, playerId: 'player-42', tagnumber: '42' },
      async (fields) => reports.push(fields),
    )
    const { queueTagWithUploadRecovery } = loadRecovery({ biketag: TestSDK })
    const result = await queueTagWithUploadRecovery(sdk, payload, 'aws', (stage, details) => {
      log.record(stage, details)
      attempt.record(stage, details)
    })
    assert.equal(result.success, true, result.error)
    assert.equal(puts.length, 2)
    assert.equal(signs.length, 2)
    assert.equal(signs[1].key, signs[0].key)
    assert.equal(signs[1].p_id, 'player-42')
    assert.equal(signs[1].contentType, 'image/jpeg')
    assert.equal(puts[1].data, puts[0].data)
    assert.equal(puts[1].data.byteLength, originalFile.size)
    assert.equal(payload[slot + 'Image'], originalFile)
    assert.equal(sdk.plainFetcher.defaults.adapter, originalAdapter)
    assert.equal(clients.length, 2)
    assert.equal(reads.length, 2) // No re-running queue validation or publication on retry.
    assert.match(result.data[slot + 'ImageUrl'], /digitaloceanspaces\.com/)
    assert.equal(
      log.events.filter((e) => e.stage === 'image:sign-url' && e.event === 'completed').length,
      2,
    )
    await attempt.succeeded()
    attempt.dispose()
    assert.equal(reports.length, 0)
    assert.doesNotMatch(JSON.stringify(log.events), /PRIVATE|IMAGE_BYTES/)

    // Exhaust automatic recovery, then use the untouched File for another manual submission.
    failAlways = true
    const failedAttempt = diagnostics.createSubmissionAttempt(
      { game: 'demo', action: slot, playerId: 'player-42', tagnumber: '42' },
      async (fields) => reports.push(fields),
    )
    const failed = await queueTagWithUploadRecovery(sdk, payload, 'aws', failedAttempt.record)
    assert.equal(failed.success, false)
    assert.equal(puts.length, 4)
    assert.equal(payload[slot + 'Image'], originalFile)
    await failedAttempt.failed(failed.error, 'image:upload')
    failedAttempt.dispose()
    assert.equal(reports.length, 1)
    const events = JSON.parse(reports[0].diagnostics).events
    assert.equal(
      events.filter((e) => e.stage === 'image:upload' && e.event === 'failed' && e.transferAttempt)
        .length,
      2,
    )
    assert.ok(events.some((e) => e.error?.code === 'ERR_NETWORK'))
    assert.doesNotMatch(JSON.stringify(reports), /PRIVATE|IMAGE_BYTES/)
    failAlways = false
    const manualRetry = await queueTagWithUploadRecovery(sdk, payload, 'aws')
    assert.equal(manualRetry.success, true, manualRetry.error)

    const unreadable = new File(['unreadable'], 'photo.jpeg', { type: 'image/jpeg' })
    unreadable.arrayBuffer = async () => {
      throw new DOMException('The requested file could not be read', 'NotReadableError')
    }
    const failedReadPayload = { ...payload, [slot + 'Image']: unreadable }
    const putsBefore = puts.length
    const signsBefore = signs.length
    const failedRead = await queueTagWithUploadRecovery(sdk, failedReadPayload, 'aws')
    assert.equal(failedRead.success, false)
    assert.match(failedRead.error, /file could not be read/)
    assert.equal(puts.length, putsBefore)
    assert.equal(signs.length, signsBefore + 1)
    assert.equal(failedReadPayload[slot + 'Image'], unreadable)
  }
})

test('Imgur and completed queue submissions keep the existing client path', async () => {
  const calls = []
  const client = {
    config: () => assert.fail('Non-upload operations must not create an upload client'),
    queueTag: async (...args) => {
      calls.push(args)
      return { success: true }
    },
  }
  const { queueTagWithUploadRecovery } = loadRecovery()
  const filePayload = { foundImage: new File(['bytes'], 'photo.jpg') }
  const completePayload = { foundImageUrl: 'found', mysteryImageUrl: 'mystery' }
  await queueTagWithUploadRecovery(client, filePayload, 'imgur')
  await queueTagWithUploadRecovery(client, completePayload, 'aws')
  assert.deepEqual(calls, [
    [filePayload, { source: 'imgur' }],
    [completePayload, { source: 'aws' }],
  ])
})
