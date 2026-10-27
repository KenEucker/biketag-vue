const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(file, dependencies = {}, source) {
  const filename = path.resolve(file)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = loaded.require.bind(loaded)
  loaded.require = (name) => dependencies[name] ?? originalRequire(name)
  loaded._compile(
    ts.transpileModule(source ?? fs.readFileSync(filename, 'utf8'), {
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

const { BikeTagClient, createTagObject } = require('biketag')
const constants = load('functions/common/constants.ts')
const current = { game: 'demo', tagnumber: 42, mysteryPlayer: 'Previous rider' }
const next = {
  game: 'demo',
  tagnumber: 43,
  playerId: 'rider',
  foundPlayer: 'Rider',
  mysteryPlayer: 'Rider',
  foundTime: 100,
  mysteryTime: 101,
  foundImageUrl: 'https://example.org/found.webp',
  mysteryImageUrl: 'https://example.org/mystery.webp',
  hint: 'Around the corner',
}

function endpoint({ profile, currentResponse, publishResult, finalize, locks = new Map() } = {}) {
  const clients = []
  const reads = []
  const publications = []
  class Client {
    constructor(options) {
      clients.push(options)
    }
    async game() {
      return { name: 'demo', awsRegion: 'sfo2' }
    }
    async getTag(payload, options) {
      reads.push({ payload, options })
      return currentResponse ?? { success: true, data: { ...current } }
    }
  }
  const lock = load('functions/common/round-publication.ts', {
    './constants': constants,
    '@netlify/blobs': {
      getStore: () => ({
        async set(key, value, options) {
          assert.equal(options.onlyIfNew, true)
          if (locks.has(key)) return { modified: false }
          locks.set(key, value)
          return { modified: true }
        },
        async delete(key) {
          locks.delete(key)
        },
      }),
    },
  })
  const methods = fs.readFileSync('functions/common/methods.ts', 'utf8')
  const source = methods.slice(
    methods.indexOf('export const setNewBikeTagPost ='),
    methods.indexOf('export const getWinningTagForCurrentRound ='),
  )
  const setNewBikeTagPost = new Function(
    ...Object.keys(lock),
    'getGameStorageSlug',
    'summarizeTagGps',
    'log',
    'getImageSource',
    'HttpStatusCode',
    'finalizeNewBikeTagPost',
    ts.transpileModule(source.replace('export const ', 'const '), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText + '\nreturn setNewBikeTagPost',
  )(
    ...Object.values(lock),
    () => 'demo',
    () => ({}),
    () => {},
    () => 'aws',
    constants.HttpStatusCode,
    async (...args) => {
      publications.push(args)
      if (finalize) return finalize(...args)
      return publishResult ?? { errors: false, results: [] }
    },
  )
  const handler = load('functions/new.mts', {
    biketag: { BikeTagClient: Client, createTagObject },
    './common/constants': constants,
    './common': {
      acceptCorsHeaders: () => ({}),
      getProfileAuthorization: async () =>
        profile === undefined ? { sub: 'ambassador', isBikeTagAmbassador: true } : profile,
      getPayloadOpts: (req) => req.json(),
      getBikeTagClientOpts: (_req, _authorized, admin) => ({ admin }),
      getGameStorageSlug: () => 'demo',
      getImageSource: () => 'aws',
      log() {},
      setNewBikeTagPost,
    },
  }).default
  return {
    clients,
    reads,
    publications,
    request: (changes = {}, method = 'POST') =>
      handler(
        new Request('https://demo.example/api/new', {
          method,
          ...(method === 'POST'
            ? { body: JSON.stringify({ ...next, ambassadorId: 'ambassador', ...changes }) }
            : {}),
        }),
      ),
  }
}

test('new endpoint refuses non-ambassadors and mismatched identities before accessing storage', async () => {
  for (const profile of [
    null,
    { sub: 'ambassador' },
    { sub: 'ambassador', isBikeTagAmbassador: false },
    { sub: 'someone-else', isBikeTagAmbassador: true },
  ]) {
    const flow = endpoint({ profile })
    assert.equal((await flow.request()).status, 401)
    assert.equal(flow.clients.length, 0)
    assert.equal(flow.publications.length, 0)
  }
})

test('new endpoint rejects stale, skipped and invalid rounds before publication', async () => {
  for (const tagnumber of [42, 41, 44, 0, -1, 43.5, '43', null]) {
    const flow = endpoint()
    const response = await flow.request({ tagnumber })
    assert.ok([400, 409].includes(response.status), String(tagnumber))
    assert.equal(flow.publications.length, 0)
  }
})

test('new endpoint reads the live round without cache and publishes only its successor', async () => {
  const flow = endpoint()
  assert.equal((await flow.request()).status, 202)
  assert.equal(flow.reads[0].options.cached, false)
  assert.equal(flow.publications.length, 1)
  assert.equal(flow.publications[0][1].tagnumber, 43)
  assert.equal(flow.publications[0][2].tagnumber, 42)
})

test('new endpoint rejects a form after the live round advances and repeated requests', async () => {
  const live = { success: true, data: { ...current } }
  const flow = endpoint({ currentResponse: live })
  assert.equal((await flow.request()).status, 202)
  live.data.tagnumber = 43
  const response = await flow.request()
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /round|refresh/i)
  assert.equal(flow.publications.length, 1)
})

test('separate invocations cannot publish the same successor concurrently', async () => {
  const locks = new Map()
  const live = { success: true, data: { ...current } }
  let release
  let started
  const publishing = new Promise((resolve) => {
    started = resolve
  })
  const blocked = new Promise((resolve) => {
    release = resolve
  })
  const winner = endpoint({
    locks,
    currentResponse: live,
    async finalize() {
      started()
      await blocked
      live.data = { ...next }
      return { errors: false, results: [] }
    },
  })
  const contender = endpoint({ locks, currentResponse: live })
  const first = winner.request()
  await publishing
  try {
    const conflict = await contender.request()
    assert.equal(conflict.status, 409)
    assert.deepEqual(await conflict.json(), {
      error: 'The current round has changed. Refresh before submitting.',
    })
    assert.equal(contender.reads.length, 0)
    assert.equal(contender.publications.length, 0)
  } finally {
    release()
  }
  assert.equal((await first).status, 202)
  assert.equal(locks.size, 0)
  assert.equal((await contender.request()).status, 409)
  assert.equal(contender.publications.length, 0)
})

test('publication lock is released on failed reads, stale rounds and thrown publications', async () => {
  for (const options of [
    { currentResponse: { success: false } },
    { currentResponse: { success: true, data: next } },
    {
      finalize: async () => {
        throw Error('storage unavailable')
      },
    },
  ]) {
    const locks = new Map()
    const flow = endpoint({ ...options, locks })
    assert.ok((await flow.request()).status >= 400)
    assert.equal(locks.size, 0)
  }
})

test('actual Blobs adapter refuses contention and storage errors before publication', async (t) => {
  const blobs = require('@netlify/blobs')
  const { withRoundPublicationLock } = load('functions/common/round-publication.ts', {
    './constants': constants,
    '@netlify/blobs': {
      getStore: (options) =>
        blobs.getStore({
          ...options,
          siteID: 'test-site',
          token: 'test-token',
          apiURL: 'https://example.org',
        }),
    },
  })
  for (const status of [412, 403]) {
    let publications = 0
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (url.startsWith('https://example.org/')) {
        return Response.json({ url: 'https://storage.example.org/lock' })
      }
      assert.equal(new Headers(options.headers).get('if-none-match'), '*')
      return new Response('', { status })
    })
    await assert.rejects(
      withRoundPublicationLock('demo', async () => {
        publications++
      }),
      status === 412 ? /current round has changed/ : /lock storage failed/,
    )
    assert.equal(publications, 0)
    t.mock.restoreAll()
  }
})

test('new endpoint fails closed when the current tag cannot be read or the game has not launched', async () => {
  for (const currentResponse of [
    { success: false, data: current },
    { success: true },
    { success: true, data: { tagnumber: 0 } },
  ]) {
    const flow = endpoint({ currentResponse })
    assert.ok((await flow.request()).status >= 400)
    assert.equal(flow.publications.length, 0)
  }
})

test('new endpoint retains method handling and publication failures', async () => {
  const flow = endpoint({ publishResult: { errors: true, results: [{ error: 'storage failed' }] } })
  assert.equal((await flow.request({}, 'OPTIONS')).status, 204)
  assert.equal((await flow.request({}, 'GET')).status, 405)
  assert.equal(flow.clients.length, 0)
  assert.equal((await flow.request()).status, 400)
})

function storeAction(client, imageSource = 'imgur') {
  const source = fs.readFileSync('src/store/index.ts', 'utf8')
  const start = source.indexOf('    async createNewRoundTag(')
  const code = ts.transpileModule(
    'const actions = {' +
      source.slice(start, source.indexOf('    async assignPlayerName(', start)) +
      '}',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const action = new Function('client', 'getApiUrl', code + '\nreturn actions.createNewRoundTag')(
    client,
    (name) => '/api/' + name,
  )
  const state = {
    profile: { sub: 'ambassador', isBikeTagAmbassador: true },
    gameName: 'demo',
    game: { queuehash: 'queue-album' },
    imageSource,
    auth0Token: 'test-token',
    async fetchCredentials() {},
    resetBikeTagCache() {},
  }
  return (tag) => action.call(state, tag)
}

const photos = () => ({
  ...next,
  foundImageUrl: '',
  mysteryImageUrl: '',
  foundImage: new Blob(['found'], { type: 'image/jpeg' }),
  mysteryImage: new Blob(['mystery'], { type: 'image/png' }),
})

test('actual Imgur adapter uploads both photos to the queue with separate round numbers', async () => {
  const sdk = new BikeTagClient({
    game: 'demo',
    imgur: { clientId: 'test', hash: 'main-album', queuehash: 'queue-album' },
  })
  const uploads = []
  sdk.imgurClient.upload = async (payload) => {
    uploads.push(payload)
    return {
      success: true,
      status: 200,
      data: { link: `https://i.imgur.com/${uploads.length}.jpg` },
    }
  }
  let published
  let refreshes = 0
  const client = {
    uploadTagImage: sdk.uploadTagImage.bind(sdk),
    async getQueue() {
      refreshes++
      return { success: true, data: [] }
    },
    async plainRequest(request) {
      published = request
      return { status: 202, data: { errors: false } }
    },
  }
  const tag = photos()
  assert.equal(await storeAction(client)(tag), true)
  assert.equal(uploads.length, 2)
  assert.equal(uploads[0].album, 'queue-album')
  assert.equal(uploads[1].album, 'queue-album')
  assert.match(uploads[0].description, /^#42 proof/)
  assert.match(uploads[1].description, /^#43 tag/)
  assert.equal(uploads[0].image, tag.foundImage)
  assert.equal(uploads[1].image, tag.mysteryImage)
  assert.equal(published.data.tagnumber, 43)
  assert.equal(published.data.foundImageUrl, 'https://i.imgur.com/1.jpg')
  assert.equal(published.data.mysteryImageUrl, 'https://i.imgur.com/2.jpg')
  assert.equal(refreshes, 1)
})

test('actual AWS adapter preserves photo rounds, types and metadata when uploading separately', async () => {
  const sdk = new BikeTagClient({
    game: 'demo',
    aws: { region: 'sfo2', accessKeyId: 'test', secretAccessKey: 'test' },
  })
  const uploads = []
  sdk.awsClient.send = async (command) => {
    assert.equal(command.constructor.name, 'PutObjectCommand')
    uploads.push(command.input)
    return {}
  }
  let published
  const client = {
    uploadTagImage: sdk.uploadTagImage.bind(sdk),
    async getQueue() {
      return { success: true, data: [] }
    },
    async plainRequest(request) {
      published = request.data
      return { status: 202, data: { errors: false } }
    },
  }
  assert.equal(await storeAction(client, 'aws')(photos()), true)
  assert.equal(uploads.length, 2)
  assert.match(uploads[0].Key, /^queue\/demo-tag-42--found--.*\.jpg$/)
  assert.match(uploads[1].Key, /^queue\/demo-tag-43--mystery--.*\.png$/)
  assert.equal(uploads[0].ContentType, 'image/jpeg')
  assert.equal(uploads[1].ContentType, 'image/png')
  assert.equal(JSON.parse(Buffer.from(uploads[0].Metadata.data, 'base64')).t, 42)
  assert.equal(JSON.parse(Buffer.from(uploads[1].Metadata.data, 'base64')).t, 43)
  assert.equal(published.tagnumber, 43)
  assert.match(published.foundImageUrl, /tag-42--found/)
  assert.match(published.mysteryImageUrl, /tag-43--mystery/)
})

test('upload failures stop publication and existing image URLs do not upload again', async () => {
  let publications = 0
  const action = storeAction({
    async uploadTagImage() {
      return { success: false, error: 'upload denied' }
    },
    async plainRequest() {
      publications++
      return { status: 202, data: { errors: false } }
    },
  })
  assert.equal(await action(photos()), 'upload denied')
  assert.equal(publications, 0)
  assert.equal(await action(next), true)
  assert.equal(publications, 1)
})

test('store retains the server conflict message for a stale round', async () => {
  const error = { response: { data: { error: 'Round changed. Refresh before submitting.' } } }
  const action = storeAction({
    async plainRequest() {
      throw error
    },
  })
  assert.equal(await action(next), error.response.data.error)
})

test('store preserves rejected publication details, plain text and error fallbacks', async () => {
  for (const [body, expected] of [
    [
      {
        errors: true,
        results: [
          { message: 'success' },
          { error: 'write failed', message: 'Current tag was not updated' },
          { error: 'new tag failed' },
        ],
      },
      'Current tag was not updated, new tag failed',
    ],
    ["you don't have permission to do that", "you don't have permission to do that"],
    [{ errors: true, results: [], error: 'Server error' }, 'Server error'],
    [{ errors: true, results: null }, 'error creating new round'],
    [undefined, 'error creating new round'],
  ]) {
    const action = storeAction({
      async plainRequest() {
        throw { response: { data: body } }
      },
    })
    assert.equal(await action(next), expected)
  }
})

const methods = fs.readFileSync('src/common/methods.ts', 'utf8')
const { sendNetlifyForm } = load(
  'src/common/methods.ts',
  {},
  methods.slice(
    methods.indexOf('export const sendNetlifyError'),
    methods.indexOf('export const GetQueryString'),
  ),
)

function viewFlow({ result = true, reportError = false } = {}) {
  const source = fs.readFileSync('src/views/New.vue', 'utf8')
  const handler = source.slice(
    source.indexOf('async function onSubmitClick()'),
    source.indexOf('onMounted('),
  )
  const notices = [],
    reports = [],
    calls = []
  const deps = {
    newTag: { ...next },
    submitInProgress: { value: false },
    submitSuccess: { value: false },
    getGameName: { value: 'demo & friends' },
    getAmbassadorId: { value: 'ambassador' },
    submitError: { value: null },
    t: (key) => key,
    toast: { open: (notice) => notices.push(notice) },
    console: { error() {}, warn() {} },
    store: {
      async createNewRoundTag(tag) {
        calls.push(tag)
        if (result instanceof Error) throw result
        return result
      },
      resetBikeTagCache() {},
    },
    sendNetlifyForm,
    async sendNetlifyError(message) {
      reports.push(message)
      if (reportError) throw Error('report failed')
    },
  }
  return {
    ...deps,
    notices,
    reports,
    calls,
    submit: new Function(...Object.keys(deps), handler + '\nreturn onSubmitClick')(
      ...Object.values(deps),
    ),
  }
}

test('published new round stays successful when activity reporting returns HTTP 404 or throws', async (t) => {
  for (const fail of [
    async () => new Response('', { status: 404 }),
    async () => {
      throw Error('offline')
    },
  ]) {
    const flow = viewFlow()
    let request
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(flow.submitSuccess.value, true)
      request = { url, ...options }
      return fail()
    })
    await flow.submit()
    await flow.submit()
    assert.equal(flow.submitSuccess.value, true)
    assert.equal(flow.submitInProgress.value, false)
    assert.equal(flow.calls.length, 1)
    assert.equal(flow.reports.length, 0)
    assert.equal(flow.notices.at(-1).type, 'success')
    assert.equal(request.url, '/')
    assert.deepEqual(Object.fromEntries(new URLSearchParams(request.body)), {
      'form-name': 'new-round-success',
      game: 'demo & friends',
      tagnumber: '43',
      ambassadorId: 'ambassador',
    })
    t.mock.restoreAll()
  }
})

test('new round prevents duplicate clicks while publishing', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 200 }))
  const flow = viewFlow()
  await Promise.all([flow.submit(), flow.submit()])
  assert.equal(flow.calls.length, 1)
})

test('publication failures remain visible even if their error report fails', async () => {
  for (const result of ['Round changed', new Error('network failed')]) {
    const flow = viewFlow({ result, reportError: true })
    await flow.submit()
    assert.equal(flow.submitSuccess.value, false)
    assert.equal(flow.submitInProgress.value, false)
    assert.equal(flow.notices.at(-1).type, 'error')
    assert.equal(flow.reports.length, 1)
  }
})

test('new round activity forms and all submitted fields exist in deploy-time HTML', () => {
  const html = fs.readFileSync('index.html', 'utf8')
  for (const [name, fields] of [
    ['new-round-success', ['form-name', 'game', 'tagnumber', 'ambassadorId']],
    ['new-round-error', ['form-name', 'game', 'tagnumber', 'ambassadorId', 'message', 'ip']],
  ]) {
    const form = html.match(new RegExp(`<form\\b[^>]*name="${name}"[^>]*>[\\s\\S]*?<\\/form>`))?.[0]
    assert.ok(form, `${name} must be registered at deploy time`)
    for (const field of fields) assert.ok(form.includes(`name="${field}"`), field)
  }
})
