const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(file, dependencies = {}) {
  const filename = path.resolve(file)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = loaded.require.bind(loaded)
  loaded.require = (name) => dependencies[name] ?? originalRequire(name)
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  )
  return loaded.exports
}

const fields = load('src/common/tag-metadata.ts')
const encoder = load('functions/common/tag-metadata.ts', {
  '../../src/common/tag-metadata': fields,
})
const storage = load('functions/common/storage-metadata.ts')
const base = 'main/seattle-tag-42--mystery'
const encode = (data) => Buffer.from(JSON.stringify(data), 'utf8').toString('base64')

function harness({
  profile = { email: 'admin@example.org' },
  pages,
  metadata,
  tag,
  missingIndex = false,
  source = 'aws',
} = {}) {
  const calls = []
  let page = 0
  class BikeTagClient {
    constructor() {
      calls.push('client')
    }
    async game() {
      return { name: 'Seattle', slug: 'seattle', awsRegion: 'sfo2' }
    }
    config() {}
    async getTags(...args) {
      calls.push(args)
      return { success: true, data: tag ? [tag] : [] }
    }
  }
  const handler = load('functions/tag-metadata.mts', {
    biketag: { BikeTagClient },
    './common': {
      acceptCorsHeaders: () => ({}),
      getProfileAuthorization: async () => profile,
      requireGlobalAdmin: (profile) => profile?.email === 'admin@example.org',
      getBikeTagClientOpts: () => ({ game: 'seattle' }),
      getGameStorageSlug: (game) => game.slug,
      getImageSource: () => source,
      createQueueStorageClient: () => ({
        send: async (command) => {
          calls.push({ name: command.constructor.name, ...command.input })
          if (command.constructor.name === 'ListObjectsV2Command') {
            return pages?.[page++] ?? { Contents: [{ Key: base + '.webp' }] }
          }
          if (command.constructor.name === 'GetObjectCommand') {
            if (missingIndex) throw Object.assign(new Error('Missing index'), { name: 'NoSuchKey' })
            return { Body: { transformToString: async () => JSON.stringify(tag ? [tag] : []) } }
          }
          if (command.constructor.name === 'HeadObjectCommand')
            return { Metadata: metadata ?? { data: encode({ t: 42, h: 'Café 🚲' }) } }
          throw new Error('Unexpected storage mutation')
        },
      }),
    },
    './common/storage-metadata': storage,
    './common/tag-metadata': encoder,
    '../src/common/tag-metadata': fields,
  }).default
  return {
    calls,
    async request(payload, method = 'POST') {
      const response = await handler(
        new Request('https://seattle.biketag.org/api/tag-metadata', {
          method,
          ...(method === 'POST'
            ? { body: typeof payload === 'string' ? payload : JSON.stringify(payload) }
            : {}),
        }),
      )
      return {
        status: response.status,
        body: response.status === 204 ? null : await response.json(),
        headers: response.headers,
      }
    },
  }
}
const request = (action, extra = {}) => ({ action, type: 'mystery', tagnumber: 42, ...extra })

test('anonymous users and ambassadors cannot retrieve, load, or generate metadata', async () => {
  for (const profile of [
    null,
    { email: 'ambassador@example.org', isBikeTagAmbassador: true, isBikeTagAdmin: true },
  ]) {
    const api = harness({ profile })
    for (const action of ['retrieve', 'load', 'generate']) {
      assert.equal((await api.request(request(action, { tag: {} }))).status, 403)
    }
    assert.deepEqual(api.calls, [])
  }
})

test('retrieve returns exact stored bytes, handles pagination, and excludes variants and other tags', async () => {
  const encoded = '  {"t":42,"h":"legacy JSON"}  '
  const api = harness({
    metadata: { data: encoded },
    pages: [
      {
        Contents: [{ Key: base + '_small.webp' }, { Key: base + '--other.webp' }],
        IsTruncated: true,
        NextContinuationToken: 'page2',
      },
      {
        Contents: [
          { Key: base + '.jpg' },
          { Key: base + '.webp' },
          { Key: base + '.extra.webp' },
          { Key: 'main/seattle-tag-420--mystery.webp' },
        ],
      },
    ],
  })
  const result = await api.request(request('retrieve'))
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.deepEqual(
    result.body.entries.map((entry) => entry.key),
    [base + '.jpg', base + '.webp'],
  )
  for (const entry of result.body.entries) {
    assert.equal(entry.encoded, encoded)
    assert.deepEqual(entry.decoded, { t: 42, h: 'legacy JSON' })
  }
  assert.equal(
    api.calls.filter((call) => call.name === 'ListObjectsV2Command')[1].ContinuationToken,
    'page2',
  )
  assert.ok(
    api.calls
      .filter((call) => call.name)
      .every((call) => ['ListObjectsV2Command', 'HeadObjectCommand'].includes(call.name)),
  )
})

test('missing images, absent data metadata, and malformed stored data remain distinguishable', async () => {
  const missing = harness({ pages: [{ Contents: [] }] })
  assert.equal((await missing.request(request('retrieve'))).status, 404)
  const absent = await harness({ metadata: {} }).request(request('retrieve'))
  assert.equal(absent.body.entries[0].encoded, null)
  const malformed = await harness({ metadata: { data: '{invalid JSON' } }).request(
    request('retrieve'),
  )
  assert.equal(malformed.body.entries[0].encoded, '{invalid JSON')
  assert.equal(malformed.body.entries[0].decoded, '{invalid JSON')
})

test('generate uses SDK-compatible compact keys and UTF-8 encoding without touching storage', async () => {
  const api = harness()
  const tag = {
    tagnumber: 99,
    playerId: 'rider',
    mysteryPlayer: 'Zoë 🚲',
    mysteryTime: 0,
    hint: '',
    discussionUrl: 'https://example.org/discuss',
    shareUrl: 'https://example.org/share',
    mentionUrl: 'https://example.org/mention',
    ignored: 'not metadata',
    foundPlayer: 'other',
  }
  const result = await api.request(request('generate', { tag }))
  const expected = {
    t: 42,
    p: 'rider',
    mp: 'Zoë 🚲',
    mt: 0,
    h: '',
    d: tag.discussionUrl,
    s: tag.shareUrl,
    m: tag.mentionUrl,
  }
  assert.equal(result.status, 200)
  assert.equal(result.body.entries[0].encoded, encode(expected))
  assert.deepEqual(result.body.entries[0].decoded, expected)
  assert.deepEqual(api.calls, [])
  const found = await api.request(
    request('generate', {
      type: 'found',
      tag: {
        playerId: 'rider',
        foundPlayer: 'Finder',
        foundTime: 12,
        foundLocation: 'Park',
        gps: { lat: 0, long: -122, alt: 0 },
        confirmedBoundary: false,
      },
    }),
  )
  assert.deepEqual(found.body.entries[0].decoded, {
    t: 42,
    p: 'rider',
    fp: 'Finder',
    ft: 12,
    fl: 'Park',
    g: { lat: 0, long: -122, alt: 0 },
    c: false,
  })
})

test('load reads the published index directly without rebuilding a missing index', async () => {
  const tag = { tagnumber: 42, mysteryPlayer: 'Rider', hint: 'Corner' }
  const api = harness({ tag })
  const result = await api.request(request('load'))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.tag, tag)
  assert.deepEqual(api.calls[1], {
    name: 'GetObjectCommand',
    Bucket: 'seattle-biketag',
    Key: 'main/index.json',
  })
  assert.equal((await harness().request(request('load'))).status, 404)
  const missing = harness({ missingIndex: true })
  assert.equal((await missing.request(request('load'))).status, 404)
  assert.equal(missing.calls.length, 2)
})

test('load supports games using another image source', async () => {
  const tag = { tagnumber: 42, hint: 'Corner' }
  const api = harness({ source: 'imgur', tag })
  assert.deepEqual((await api.request(request('load'))).body.tag, tag)
  assert.deepEqual(api.calls[1][0], { game: 'seattle', tagnumbers: [42], folder: 'main' })
  assert.equal(api.calls[1][1].cached, false)
})

test('invalid actions, tag numbers, types, and field types fail before storage access', async () => {
  const api = harness()
  for (const payload of [
    null,
    {},
    request('delete'),
    request('retrieve', { tagnumber: 0 }),
    request('retrieve', { tagnumber: 1.2 }),
    request('retrieve', { tagnumber: '42' }),
    request('retrieve', { type: '../../other' }),
    request('generate', { tag: [] }),
    request('generate', { tag: { mysteryTime: -1 } }),
    request('generate', { tag: { hint: {} } }),
    request('generate', { type: 'found', tag: { confirmedBoundary: 'false' } }),
    request('generate', { type: 'found', tag: { gps: { lat: 91, long: 0 } } }),
    request('generate', { type: 'found', tag: { gps: { lat: 0, long: '' } } }),
    '{bad',
  ]) {
    assert.equal((await api.request(payload)).status, 400)
  }
  assert.equal((await api.request(null, 'OPTIONS')).status, 204)
  assert.equal((await api.request(null, 'GET')).status, 405)
  assert.deepEqual(api.calls, [])
})

function pageHarness() {
  const vue = require('vue')
  const calls = []
  const store = vue.reactive({
    isBikeTagAdmin: true,
    auth0Token: 'test-token',
    async tagMetadata(payload) {
      calls.push(payload)
      if (payload.action === 'load')
        return {
          tag: {
            tagnumber: 42,
            playerId: 'rider',
            foundPlayer: 'Finder',
            foundTime: 0,
            gps: { lat: 0, long: 0, alt: -1 },
            confirmedBoundary: false,
          },
        }
      return { entries: [{ encoded: 'test-value', decoded: { t: 42 } }] }
    },
  })
  const source = fs
    .readFileSync('src/views/TagMetadata.vue', 'utf8')
    .split('<script setup name="TagMetadataView">')[1]
    .split('</script>')[0]
    .replace(/^import .*$/gm, '')
  const scope = {
    useBikeTagStore: () => store,
    tagMetadataFields: fields.tagMetadataFields,
    ...Object.fromEntries(
      ['computed', 'nextTick', 'reactive', 'ref', 'watch'].map((key) => [key, vue[key]]),
    ),
  }
  const page = new Function(
    ...Object.keys(scope),
    `${source}\nreturn { tagnumber, type, fields, gps, confirmedBoundary, entries, error, notice, ready, loadFields, retrieve, generate }`,
  )(...Object.values(scope))
  return { page, store, calls, nextTick: vue.nextTick }
}

test('page loads fields and generates found metadata preserving zero GPS, zero time and false boundary', async () => {
  const { page, calls, nextTick } = pageHarness()
  page.tagnumber.value = 42
  page.type.value = 'found'
  await nextTick()
  await page.loadFields()
  assert.match(page.notice.value, /Loaded fields from tag #42/)
  await page.generate()
  assert.deepEqual(calls[1], {
    action: 'generate',
    type: 'found',
    tagnumber: 42,
    tag: {
      playerId: 'rider',
      foundPlayer: 'Finder',
      foundTime: 0,
      gps: { lat: 0, long: 0, alt: -1 },
      confirmedBoundary: false,
    },
  })
  assert.equal(page.entries.value[0].encoded, 'test-value')
  page.fields.foundPlayer = 'Changed'
  await nextTick()
  assert.deepEqual(page.entries.value, [])
  page.tagnumber.value = 43
  await nextTick()
  assert.deepEqual({ ...page.fields }, {})
  assert.deepEqual({ ...page.gps }, { lat: '', long: '', alt: '' })
})

test('page prevents incomplete GPS and removes results and access when admin status is lost', async () => {
  const { page, store, calls, nextTick } = pageHarness()
  page.tagnumber.value = 42
  page.type.value = 'found'
  await nextTick()
  page.gps.lat = 0
  await nextTick()
  await page.generate()
  assert.match(page.error.value, /both latitude and longitude/)
  assert.deepEqual(calls, [])
  await page.retrieve()
  assert.equal(page.entries.value.length, 1)
  store.isBikeTagAdmin = false
  await nextTick()
  assert.equal(page.ready.value, false)
  assert.deepEqual(page.entries.value, [])
  await page.retrieve()
  assert.equal(calls.length, 1)
})
