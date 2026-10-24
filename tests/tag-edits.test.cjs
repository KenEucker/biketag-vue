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

const edits = load('src/common/tag-edits.ts')
const { mergeTagsForEdit, getTagEditUpdates } = edits
const { prepareTagMetadataUpdate, updateMainTagMetadata } = load('functions/common/tag-update.ts', {
  '../../src/common/tag-edits': edits,
  './storage-metadata': load('functions/common/storage-metadata.ts'),
})
const image = (round, type) =>
  `https://seattle-biketag.sfo2.cdn.digitaloceanspaces.com/main/seattle-tag-${round}--${type}.webp`
const current = {
  game: 'seattle',
  tagnumber: 1700,
  playerId: 'rider',
  mysteryPlayer: 'u/najadojo',
  mysteryTime: 1792684515,
  hint: 'Inching towards ballad',
  mysteryImageUrl: image(1700, 'mystery'),
  foundImageUrl: '',
  gps: { lat: 0, long: 0, alt: 0 },
}
const previous = {
  ...current,
  tagnumber: 1699,
  mysteryPlayer: 'Previous rider',
  mysteryImageUrl: image(1699, 'mystery'),
  hint: 'Go around the block and you might see a real one!',
  foundPlayer: 'u/najadojo',
  foundTime: 1792684475,
  foundLocation: 'Seattle Steam Company',
  foundImageUrl: image(1699, 'found'),
  gps: { lat: 47.6, long: -122.3, alt: 0 },
}

test('Seattle #1700 hint correction updates only #1700 and carries no image fields', () => {
  const display = mergeTagsForEdit(current, previous)
  const updates = getTagEditUpdates(current, previous, {
    ...display,
    hint: 'Inching towards ballard',
  })
  assert.deepEqual(updates, [{ game: 'seattle', tagnumber: 1700, hint: 'Inching towards ballard' }])
  assert.equal(display.foundImageUrl, image(1699, 'found'))
  assert.deepEqual(display.gps, previous.gps)
})

test('find edits go to #1699 and mystery edits go to #1700 without copying either image', () => {
  const updates = getTagEditUpdates(current, previous, {
    ...mergeTagsForEdit(current, previous),
    mysteryPlayer: 'Corrected rider',
    mysteryTime: 100,
    foundPlayer: 'Corrected finder',
    foundTime: 99,
    foundLocation: 'Corrected location',
    gps: { lat: 0, long: 0, alt: 0 },
  })
  assert.deepEqual(updates, [
    { game: 'seattle', tagnumber: 1700, mysteryPlayer: 'Corrected rider', mysteryTime: 100 },
    {
      game: 'seattle',
      tagnumber: 1699,
      foundPlayer: 'Corrected finder',
      foundTime: 99,
      foundLocation: 'Corrected location',
      gps: { lat: 0, long: 0, alt: 0 },
    },
  ])
})

test('unchanged edits do nothing; empty hints are saved; game launch has no previous round', () => {
  assert.deepEqual(getTagEditUpdates(current, previous, mergeTagsForEdit(current, previous)), [])
  assert.deepEqual(getTagEditUpdates(current, undefined, { hint: '' }), [
    { game: 'seattle', tagnumber: 1700, hint: '' },
  ])
  assert.equal(mergeTagsForEdit(current).mysteryImageUrl, current.mysteryImageUrl)
  assert.equal(mergeTagsForEdit(current).foundImageUrl, '')
})

function editorHarness(changes, result = true, { sendForm, refreshError, errorReportError } = {}) {
  const source = fs.readFileSync('src/views/Edit.vue', 'utf8')
  const handler = source.slice(
    source.indexOf('async function doSave()'),
    source.indexOf('onMounted('),
  )
  const calls = []
  const reports = []
  const notices = []
  const warnings = []
  let cacheResets = 0
  const dependencies = {
    getTagEditUpdates,
    currentTag: { value: current },
    previousTag: { value: previous },
    pendingEdits: { ...mergeTagsForEdit(current, previous), ...changes },
    editInProgress: { value: false },
    editSuccess: { value: false },
    editError: { value: null },
    getGameName: { value: 'seattle' },
    getAmbassadorId: { value: 'admin' },
    history: {},
    window: { scrollTo() {} },
    toast: { open: (notice) => notices.push(notice) },
    console: { error() {}, warn: (...args) => warnings.push(args) },
    t: (key) => key,
    store: {
      async updateCurrentTag(payload) {
        calls.push(payload)
        return result
      },
      async fetchQueuedTags() {
        if (refreshError) throw refreshError
      },
      resetBikeTagCache() {
        cacheResets++
      },
    },
    sendNetlifyForm: sendForm ?? (async (_name, _data, success) => success()),
    sendNetlifyError: async (message) => {
      reports.push(message)
      if (errorReportError) throw errorReportError
    },
  }
  const save = new Function(...Object.keys(dependencies), `${handler}\nreturn doSave`)(
    ...Object.values(dependencies),
  )
  return {
    save,
    calls,
    reports,
    notices,
    warnings,
    getCacheResets: () => cacheResets,
    ...dependencies,
  }
}

test('actual editor save submits the hint once even with duplicate clicks', async () => {
  const flow = editorHarness({ hint: 'Inching towards ballard' })
  await Promise.all([flow.save(), flow.save()])
  assert.deepEqual(flow.calls, [
    { game: 'seattle', tagnumber: 1700, hint: 'Inching towards ballard' },
  ])
  assert.equal(flow.editSuccess.value, true)
  assert.equal(flow.editInProgress.value, false)
})

test('actual editor stops on the first failure and reports the affected round', async () => {
  const flow = editorHarness(
    { hint: 'Inching towards ballard', foundLocation: 'Changed' },
    'metadata failed',
  )
  await flow.save()
  assert.equal(flow.calls.length, 1)
  assert.match(flow.reports[0], /#1700: metadata failed/)
  assert.equal(flow.editSuccess.value, false)
  assert.equal(flow.editInProgress.value, false)
})

test('saved edits remain successful when the follow-up Netlify form returns 404', async (t) => {
  const source = fs.readFileSync('src/common/methods.ts', 'utf8')
  const { sendNetlifyForm } = load(
    'src/common/methods.ts',
    {},
    source.slice(
      source.indexOf('export const sendNetlifyError'),
      source.indexOf('export const GetQueryString'),
    ),
  )
  const flow = editorHarness({ hint: 'Inching towards Ballard' }, true, {
    sendForm: sendNetlifyForm,
  })
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(flow.editSuccess.value, true)
    assert.equal(flow.getCacheResets(), 1)
    request = { url, ...options }
    return new Response('', { status: 404 })
  })
  await flow.save()
  assert.equal(flow.editSuccess.value, true)
  assert.equal(flow.editInProgress.value, false)
  assert.equal(flow.calls.length, 1)
  assert.equal(flow.notices.at(-1).type, 'success')
  assert.equal(
    flow.notices.some((notice) => notice.type === 'error'),
    false,
  )
  assert.equal(flow.reports.length, 0)
  assert.match(String(flow.warnings[0]), /Edit saved.*HTTP 404/)
  assert.equal(request.url, '/')
  assert.equal(request.method, 'POST')
  assert.deepEqual(Object.fromEntries(new URLSearchParams(request.body)), {
    'form-name': 'edit-tag-success',
    game: 'seattle',
    tagnumber: '1700',
    ambassadorId: 'admin',
  })
})

test('queue refresh failures cannot turn a saved edit into an error', async () => {
  const flow = editorHarness({ hint: 'new hint' }, true, { refreshError: new Error('HTTP 404') })
  await flow.save()
  assert.equal(flow.editSuccess.value, true)
  assert.equal(flow.notices.at(-1).type, 'success')
  assert.equal(flow.reports.length, 0)
  assert.match(String(flow.warnings[0]), /queue refresh failed/)
})

test('an actual update failure remains visible even if its error report also fails', async () => {
  const flow = editorHarness({ hint: 'new hint' }, 'Update returned HTTP 404', {
    errorReportError: new Error('Report HTTP 404'),
  })
  await flow.save()
  assert.equal(flow.editSuccess.value, false)
  assert.equal(flow.notices.at(-1).type, 'error')
  assert.match(flow.notices.at(-1).message, /Update returned HTTP 404/)
  assert.equal(flow.calls.length, 1)
  assert.match(String(flow.warnings[0]), /Could not report the edit failure/)
})

test('edit activity forms and their fields are declared in deploy-time HTML', () => {
  const html = fs.readFileSync('index.html', 'utf8')
  for (const [name, fields] of [
    ['edit-tag-success', ['form-name', 'game', 'tagnumber', 'ambassadorId']],
    ['edit-tag-error', ['form-name', 'game', 'tagnumber', 'ambassadorId', 'message', 'ip']],
  ]) {
    const form = html.match(new RegExp(`<form name="${name}"[\\s\\S]*?<\\/form>`))?.[0]
    assert.ok(form, `Missing deploy-time form: ${name}`)
    assert.match(form, /data-netlify="true"/)
    for (const field of fields)
      assert.ok(form.includes(`name="${field}"`), `Missing ${name}.${field}`)
  }
})

test('explicit metadata edits strip unchanged URLs and storage controls', () => {
  const update = prepareTagMetadataUpdate(
    {
      ...current,
      hint: 'Inching towards ballard',
      folder: 'queue',
      resize: true,
      slug: 'seattle-tag-1699',
      region: 'bad',
      hash: 'queue',
      source: 'imgur',
    },
    current,
    'seattle',
    'aws',
  )
  assert.deepEqual(update, {
    game: 'seattle',
    tagnumber: 1700,
    mysteryPlayer: current.mysteryPlayer,
    mysteryTime: current.mysteryTime,
    hint: 'Inching towards ballard',
    gps: current.gps,
  })
})

test('explicit metadata edits reject cross-round URLs and image replacement requests', () => {
  assert.throws(
    () =>
      prepareTagMetadataUpdate(
        {
          ...previous,
          mysteryImageUrl: current.mysteryImageUrl,
        },
        previous,
        'seattle',
        'aws',
      ),
    /mysteryImageUrl does not match tag #1699/,
  )
  assert.throws(
    () =>
      prepareTagMetadataUpdate(
        {
          ...current,
          foundImageUrl: previous.foundImageUrl,
        },
        current,
        'seattle',
        'aws',
      ),
    /foundImageUrl does not match tag #1700/,
  )
  assert.throws(
    () => prepareTagMetadataUpdate({ mysteryImage: 'bytes' }, current, 'seattle', 'aws'),
    /Image uploads/,
  )
  assert.throws(
    () => prepareTagMetadataUpdate({ game: 'portland' }, current, 'seattle', 'aws'),
    /game does not match/,
  )
})

function handlerHarness({
  payload,
  profile,
  existing = current,
  readSuccess = true,
  result,
  metadataOnly = true,
} = {}) {
  const calls = []
  const logs = []
  const handler = load('functions/update.mts', {
    './common/tag-update': {
      prepareTagMetadataUpdate,
      async updateMainTagMetadata(_client, payload) {
        calls.push({ method: 'updateMainTagMetadata', payload })
        return result ?? { success: true, status: 200, data: { ...existing, ...payload } }
      },
    },
    biketag: {
      BikeTagClient: class {
        game = async () => ({
          name: 'Seattle',
          awsRegion: 'sfo2',
          mainhash: 'main',
          queuehash: 'queue',
        })
        config() {}
        async getTags(payload, options) {
          calls.push({ method: 'getTags', payload, options })
          return {
            success: readSuccess,
            status: readSuccess ? 200 : 503,
            data: existing ? [existing] : [],
          }
        }
        async updateTag(payload, options) {
          calls.push({ method: 'updateTag', payload, options })
          return result ?? { success: true, status: 200, data: { ...existing, ...payload } }
        }
      },
    },
    './common': {
      acceptCorsHeaders: () => ({}),
      getProfileAuthorization: async () =>
        profile === undefined ? { sub: 'admin', isBikeTagAmbassador: true } : profile,
      getPayloadOpts: async () => ({
        ...(metadataOnly ? { metadataOnly: true } : {}),
        ...(payload ?? {
          tag: { tagnumber: 1700, hint: 'Inching towards ballard' },
          ambassadorId: 'admin',
        }),
      }),
      getBikeTagClientOpts: () => ({
        game: 'seattle',
        aws: { secretAccessKey: 'PRIVATE_STORAGE_SECRET' },
        sanity: { token: 'PRIVATE_SANITY_TOKEN' },
      }),
      createQueueStorageClient: () => ({}),
      getImageSource: () => 'aws',
      HttpStatusCode: {
        NoContent: 204,
        MethodNotAllowed: 405,
        Unauthorized: 401,
        BadRequest: 400,
        NotFound: 404,
        InternalServerError: 500,
      },
      log: (message, data) => logs.push({ message, data }),
    },
  }).default
  return {
    calls,
    logs,
    run: () => handler(new Request('https://seattle.biketag.org/api/update', { method: 'POST' })),
  }
}

test('explicit metadata handler sends edits to main with no image URLs', async () => {
  const flow = handlerHarness()
  const response = await flow.run()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).hint, 'Inching towards ballard')
  const update = flow.calls.find((call) => call.method === 'updateMainTagMetadata')
  assert.deepEqual(update.payload, {
    game: 'seattle',
    tagnumber: 1700,
    hint: 'Inching towards ballard',
  })
  for (const call of flow.calls.filter((call) => call.method === 'getTags')) {
    assert.equal(call.options.folder, 'main')
    assert.equal(call.options.hash, 'main')
    assert.equal(call.options.cached, false)
    assert.equal(call.options.resize, false)
  }
  assert.equal(
    flow.calls.some((call) => call.method === 'updateTag'),
    false,
  )
  assert.doesNotMatch(JSON.stringify(flow.logs), /PRIVATE_STORAGE_SECRET|PRIVATE_SANITY_TOKEN/)
})

test('general endpoint preserves wrapped image moves and resize options without requiring an existing tag', async () => {
  const tag = {
    ...current,
    tagnumber: 1701,
    slug: 'seattle-tag-1701',
    mysteryImageUrl: current.mysteryImageUrl.replace('/main/', '/queue/'),
    mysteryImage: 'uploaded bytes',
    folder: 'main',
    resize: true,
    host: 'seattle.biketag.org',
  }
  const flow = handlerHarness({
    metadataOnly: false,
    payload: { tag, ambassadorId: 'admin' },
    existing: null,
  })
  assert.equal((await flow.run()).status, 200)
  assert.deepEqual(flow.calls, [{ method: 'updateTag', payload: tag, options: { source: 'aws' } }])
})

test('general endpoint preserves the flat payload used by the SDK HTTP adapter', async () => {
  const payload = { ...current, folder: 'queue', resize: true, hash: 'queue', playerId: 'rider' }
  const flow = handlerHarness({
    metadataOnly: false,
    payload,
    profile: { sub: 'rider', p_id: 'rider' },
  })
  assert.equal((await flow.run()).status, 200)
  assert.deepEqual(flow.calls, [
    {
      method: 'updateTag',
      payload: { ...payload, imgur: { hash: 'queue' } },
      options: { source: 'aws' },
    },
  ])
})

test('general flat updates keep the existing queue default while wrapped tags use SDK defaults', async () => {
  const flat = handlerHarness({
    metadataOnly: false,
    payload: { ...current },
    profile: { p_id: 'rider' },
  })
  assert.equal((await flat.run()).status, 200)
  assert.equal(flat.calls[0].payload.folder, 'queue')
  assert.equal(flat.calls[0].payload.imgur.hash, 'queue')
  const wrapped = handlerHarness({
    metadataOnly: false,
    payload: { tag: { ...current }, ambassadorId: 'admin' },
  })
  assert.equal((await wrapped.run()).status, 200)
  assert.equal(wrapped.calls[0].payload.folder, undefined)
  assert.deepEqual(wrapped.calls[0].options, { source: 'aws' })
})

test('admin store explicitly opts into metadata editing', async () => {
  const source = fs.readFileSync('src/store/index.ts', 'utf8')
  const method = source.slice(
    source.indexOf('async updateCurrentTag('),
    source.indexOf('async launchGameTag('),
  )
  const js = ts.transpileModule(`const actions = { ${method} };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  let request
  const update = new Function('client', 'getApiUrl', `${js}\nreturn actions.updateCurrentTag`)(
    {
      plainRequest: async (options) => {
        request = options
        return { status: 200, data: current }
      },
    },
    (name) => `/api/${name}`,
  )
  const tag = { tagnumber: 1700, hint: 'Inching towards ballard' }
  assert.equal(
    await update.call(
      { profile: { sub: 'admin', isBikeTagAmbassador: true }, resetBikeTagCache() {} },
      tag,
    ),
    true,
  )
  assert.deepEqual(request.data, { tag, ambassadorId: 'admin', metadataOnly: true })
})

test('handler refuses invalid identity, missing tags, read failures and mismatched images before writes', async () => {
  for (const [options, status] of [
    [{ profile: null }, 401],
    [{ profile: {} }, 401],
    [
      {
        profile: { sub: 'stranger', p_id: 'stranger' },
        payload: { tag: { tagnumber: 1700, playerId: 'stranger', hint: 'oops' } },
      },
      401,
    ],
    [{ existing: null }, 404],
    [{ readSuccess: false }, 503],
    [
      {
        payload: {
          tag: { ...previous, mysteryImageUrl: current.mysteryImageUrl },
          ambassadorId: 'admin',
        },
        existing: previous,
      },
      400,
    ],
    [{ payload: { tag: { hint: 'oops' }, ambassadorId: 'admin' } }, 400],
  ]) {
    const flow = handlerHarness(options)
    assert.equal((await flow.run()).status, status)
    assert.equal(flow.calls.filter((call) => call.method !== 'getTags').length, 0)
  }
})

test('handler returns an HTTP error when the adapter reports failure with a 200 status', async () => {
  const flow = handlerHarness({ result: { success: false, status: 200, error: 'metadata failed' } })
  const response = await flow.run()
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'metadata failed')
})

function metadataStorage(tags, imageKeys, { failCopy = false, afterCopy } = {}) {
  const commands = []
  const metadata = {
    data: Buffer.from(JSON.stringify({ custom: 'preserved', s: 'share-url' })).toString('base64'),
    title: 'original title',
  }
  let index = structuredClone(tags)
  const client = {
    async send(command) {
      commands.push(command)
      const { Key, CopySource, Body } = command.input
      switch (command.constructor.name) {
        case 'GetObjectCommand':
          assert.equal(Key, 'main/index.json')
          return { Body: { transformToString: async () => JSON.stringify(index) } }
        case 'HeadObjectCommand':
          if (!imageKeys.includes(Key)) throw new Error(`Missing ${Key}`)
          return {
            Metadata: metadata,
            ContentType: 'image/webp',
            CacheControl: 'max-age=86400',
            ContentDisposition: 'inline',
          }
        case 'CopyObjectCommand':
          assert.equal(CopySource, `seattle-biketag/${Key}`)
          if (failCopy) throw new Error('Copy failed')
          if (afterCopy) index = afterCopy(index)
          return {}
        case 'PutObjectCommand':
          assert.equal(Key, 'main/index.json')
          index = JSON.parse(Body)
          return {}
        default:
          assert.fail(`Unexpected storage operation: ${command.constructor.name}`)
      }
    },
  }
  return { client, commands, getIndex: () => index }
}

test('hint edit succeeds with the incident record even when its found image is missing', async () => {
  const damaged = {
    ...current,
    foundImageUrl: image(1700, 'found'),
    foundPlayer: previous.foundPlayer,
  }
  const storage = metadataStorage([previous, damaged], ['main/seattle-tag-1700--mystery.webp'])
  const result = await updateMainTagMetadata(storage.client, {
    game: 'seattle',
    tagnumber: 1700,
    hint: 'Inching towards Ballard',
  })
  assert.equal(result.success, true, result.error)
  assert.equal(storage.getIndex()[1].hint, 'Inching towards Ballard')
  assert.deepEqual(storage.getIndex()[0], previous)
  assert.equal(storage.getIndex()[1].foundImageUrl, damaged.foundImageUrl)
  assert.deepEqual(
    storage.commands.map((command) => command.constructor.name),
    [
      'GetObjectCommand',
      'HeadObjectCommand',
      'CopyObjectCommand',
      'GetObjectCommand',
      'PutObjectCommand',
    ],
  )
  const copy = storage.commands.find(
    (command) => command.constructor.name === 'CopyObjectCommand',
  ).input
  assert.equal(copy.Key, 'main/seattle-tag-1700--mystery.webp')
  assert.equal(copy.ContentType, 'image/webp')
  assert.equal(copy.CacheControl, 'max-age=86400')
  assert.equal(copy.ContentDisposition, 'inline')
  assert.equal(copy.Metadata.title, 'original title')
  const data = JSON.parse(Buffer.from(copy.Metadata.data, 'base64'))
  assert.equal(data.h, 'Inching towards Ballard')
  assert.equal(data.custom, 'preserved')
  assert.equal(data.s, 'share-url')
  assert.equal(data.t, 1700)
})

test('metadata edits retain rounds published while object metadata was updating', async () => {
  const next = { ...current, tagnumber: 1701 }
  const storage = metadataStorage([current], ['main/seattle-tag-1700--mystery.webp'], {
    afterCopy: (tags) => [...tags, next],
  })
  const result = await updateMainTagMetadata(storage.client, {
    game: 'seattle',
    tagnumber: 1700,
    hint: 'new hint',
  })
  assert.equal(result.success, true, result.error)
  assert.deepEqual(storage.getIndex()[1], next)
  assert.equal(storage.getIndex()[0].hint, 'new hint')
})

test('found edits update only the previous round found metadata and index fields', async () => {
  const storage = metadataStorage([previous, current], ['main/seattle-tag-1699--found.webp'])
  const gps = { lat: 0, long: 0, alt: 0 }
  const result = await updateMainTagMetadata(storage.client, {
    game: 'seattle',
    tagnumber: 1699,
    foundLocation: '',
    gps,
  })
  assert.equal(result.success, true, result.error)
  assert.deepEqual(storage.getIndex()[1], current)
  assert.equal(storage.getIndex()[0].hint, previous.hint)
  assert.equal(storage.getIndex()[0].foundLocation, '')
  assert.deepEqual(storage.getIndex()[0].gps, gps)
  const copies = storage.commands.filter(
    (command) => command.constructor.name === 'CopyObjectCommand',
  )
  assert.equal(copies.length, 1)
  assert.equal(copies[0].input.Key, 'main/seattle-tag-1699--found.webp')
  const data = JSON.parse(Buffer.from(copies[0].input.Metadata.data, 'base64'))
  assert.equal(data.fl, '')
  assert.deepEqual(data.g, gps)
})

test('required image failures never report success or save an index update', async () => {
  for (const [imageKeys, options] of [
    [[], {}],
    [['main/seattle-tag-1700--mystery.webp'], { failCopy: true }],
  ]) {
    const storage = metadataStorage([current], imageKeys, options)
    const result = await updateMainTagMetadata(storage.client, {
      game: 'seattle',
      tagnumber: 1700,
      hint: 'new hint',
    })
    assert.equal(result.success, false)
    assert.equal(result.status, 400)
    assert.equal(
      storage.commands.some((command) => command.constructor.name === 'PutObjectCommand'),
      false,
    )
    assert.deepEqual(storage.getIndex(), [current])
  }
})

test('metadata edit refuses to follow a stale reference into a different round', async () => {
  const damaged = { ...current, mysteryImageUrl: previous.mysteryImageUrl }
  const storage = metadataStorage([damaged], ['main/seattle-tag-1699--mystery.webp'])
  const result = await updateMainTagMetadata(storage.client, {
    game: 'seattle',
    tagnumber: 1700,
    hint: 'new hint',
  })
  assert.equal(result.success, false)
  assert.match(result.error, /does not belong to tag #1700/)
  assert.equal(storage.commands.length, 1)
})

test('installed AWS adapter saves the hint without moving, deleting, or uploading any image', async () => {
  const { BikeTagClient } = require('biketag')
  const client = new BikeTagClient({
    game: 'seattle',
    aws: { region: 'sfo2', accessKeyId: 'test', secretAccessKey: 'test' },
  })
  const commands = []
  let savedIndex
  client.awsClient.send = async (command) => {
    commands.push(command)
    switch (command.constructor.name) {
      case 'GetObjectCommand':
        assert.equal(command.input.Key, 'main/index.json')
        return {
          Body: {
            async *[Symbol.asyncIterator]() {
              yield Buffer.from(JSON.stringify([previous, current]))
            },
          },
        }
      case 'CopyObjectCommand':
        assert.equal(command.input.Key, 'main/seattle-tag-1700--mystery.webp')
        assert.equal(command.input.CopySource, `seattle-biketag/${command.input.Key}`)
        assert.equal(
          JSON.parse(Buffer.from(command.input.Metadata.data, 'base64')).h,
          'Inching towards ballard',
        )
        return {}
      case 'PutObjectCommand':
        assert.equal(command.input.Key, 'main/index.json')
        savedIndex = JSON.parse(command.input.Body)
        return {}
      default:
        assert.fail(`Unexpected storage operation: ${command.constructor.name}`)
    }
  }
  const response = await client.updateTag(
    prepareTagMetadataUpdate(
      { ...current, hint: 'Inching towards ballard' },
      current,
      'seattle',
      'aws',
    ),
    { source: 'aws', folder: 'main', cached: false, resize: false },
  )
  assert.equal(response.success, true, JSON.stringify(response.error))
  assert.deepEqual(savedIndex[0], previous)
  assert.equal(savedIndex[1].hint, 'Inching towards ballard')
  assert.equal(savedIndex[1].mysteryImageUrl, current.mysteryImageUrl)
  assert.equal(savedIndex[1].foundImageUrl, '')
  assert.equal(
    commands.filter((command) => command.constructor.name === 'CopyObjectCommand').length,
    1,
  )
})

test('installed SDK still moves and renames images and generates variants through the resize function', async (t) => {
  const { BikeTagClient } = require('biketag')
  const sharp = require('sharp')
  const jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: 'red' } })
    .jpeg()
    .toBuffer()
  const sourceBase = 'queue/seattle-tag-1700--mystery--rider'
  const targetBase = 'main/seattle-tag-1701--mystery'
  const objects = new Map([
    ['main/index.json', { Body: Buffer.from('[]') }],
    ...['', '_small', '_medium'].map((suffix) => [`${sourceBase}${suffix}.jpg`, { Body: jpeg }]),
  ])
  const commands = []
  const resizeRequests = []
  const client = new BikeTagClient({
    game: 'seattle',
    aws: { region: 'sfo2', accessKeyId: 'test', secretAccessKey: 'test' },
  })
  client.awsClient.send = async (command) => {
    const { Key, Body, CopySource, Metadata, Prefix } = command.input
    commands.push(command)
    const missing = () =>
      Object.assign(new Error(`Missing ${Key}`), { $metadata: { httpStatusCode: 404 } })
    switch (command.constructor.name) {
      case 'GetObjectCommand': {
        const object = objects.get(Key)
        if (!object) throw missing()
        return {
          Body: {
            async *[Symbol.asyncIterator]() {
              yield object.Body
            },
          },
        }
      }
      case 'HeadObjectCommand':
        if (!objects.has(Key)) throw missing()
        return objects.get(Key)
      case 'CopyObjectCommand': {
        const source = objects.get(CopySource.replace('seattle-biketag/', ''))
        assert.ok(source, `Copy source must exist: ${CopySource}`)
        objects.set(Key, { ...source, ...(Metadata ? { Metadata } : {}) })
        return {}
      }
      case 'DeleteObjectCommand':
        objects.delete(Key)
        return {}
      case 'PutObjectCommand':
        objects.set(Key, { Body: typeof Body === 'string' ? Buffer.from(Body) : Body, Metadata })
        return {}
      case 'ListObjectsV2Command':
        return {
          Contents: [...objects.keys()]
            .filter((key) => key.startsWith(Prefix))
            .map((Key) => ({ Key })),
        }
      default:
        assert.fail(`Unexpected storage operation: ${command.constructor.name}`)
    }
  }
  const resize = load('functions/resize.mts', {
    axios: {
      get: async (url) => {
        const key = new URL(url).pathname.slice(1)
        assert.ok(objects.has(key), `Resize source must exist: ${key}`)
        return { data: objects.get(key).Body }
      },
    },
    './common/methods': {
      getPayloadOpts: async (req) => Object.fromEntries(new URL(req.url).searchParams),
      acceptCorsHeaders: () => ({}),
      log() {},
    },
  }).default
  t.mock.method(globalThis, 'fetch', async (url) => {
    const parsed = new URL(url)
    assert.ok(parsed.pathname.endsWith('/resize'))
    resizeRequests.push(parsed)
    return resize(new Request(url))
  })
  const result = await client.updateTag(
    {
      ...current,
      tagnumber: 1701,
      mysteryImageUrl: `https://seattle-biketag.sfo2.cdn.digitaloceanspaces.com/${sourceBase}.jpg`,
      hint: 'Moved deliberately',
    },
    { source: 'aws', folder: 'main', resize: true, host: 'seattle.biketag.org', cached: false },
  )
  assert.equal(result.success, true, JSON.stringify(result.error))
  assert.equal(resizeRequests.length, 3)
  assert.deepEqual(
    resizeRequests.map((url) => url.searchParams.get('width')).sort(),
    [null, '300', '800'].sort(),
  )
  for (const suffix of ['', '_small', '_medium']) {
    assert.equal(objects.has(`${sourceBase}${suffix}.jpg`), false)
    assert.equal(objects.has(`${targetBase}${suffix}.jpg`), false)
    const object = objects.get(`${targetBase}${suffix}.webp`)
    assert.ok(object, `WebP variant must exist: ${suffix || 'original'}`)
    assert.equal((await sharp(object.Body).metadata()).format, 'webp')
  }
  assert.equal(
    JSON.parse(Buffer.from(objects.get(`${targetBase}.webp`).Metadata.data, 'base64')).h,
    'Moved deliberately',
  )
  assert.ok(
    commands.some(
      (command) =>
        command.constructor.name === 'CopyObjectCommand' &&
        command.input.Key === `${targetBase}.jpg`,
    ),
  )
})
