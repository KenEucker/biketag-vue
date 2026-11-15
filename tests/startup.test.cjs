const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createSSRApp, defineComponent, h } = require('vue')
const { renderToString } = require('@vue/server-renderer')

function load(relativePath, dependencies, source = fs.readFileSync(relativePath, 'utf8')) {
  const filename = path.resolve(relativePath)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const localRequire = loaded.require.bind(loaded)
  loaded.require = (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name)
  loaded._compile(
    ts.transpileModule(source, {
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

const { getDomainInfo } = load('src/common/domain.ts', {
  './constants': { BikeTagEnv: { HOST: 'biketag.org' } },
})

test('root sites, Netlify previews and loopback hosts do not become game names', () => {
  for (const host of [
    'biketag.org',
    'www.biketag.org',
    'biketag.dev',
    'www.biketag.dev',
    'biketag-dev.netlify.app',
    '6ae044d8edc4fa43bfbe308c--biketag-dev.netlify.app',
    'deploy-preview-42--biketag-dev.netlify.app',
    'branch--biketag-dev.netlify.app',
    'localhost:8086',
    '127.0.0.1:8086',
  ]) {
    for (const request of [{ location: { host } }, { headers: new Headers({ host }) }]) {
      const result = getDomainInfo(request)
      assert.equal(result.isSubdomain, false, host)
      assert.equal(result.subdomain, null, host)
      assert.equal(result.host, host.replace(/^www\./, ''), host)
    }
  }
})

test('real game subdomains and their ports are preserved', () => {
  for (const host of ['portland.biketag.org', 'portland.biketag.dev', 'portland.localhost:8080']) {
    const result = getDomainInfo({ location: { host } })
    assert.equal(result.isSubdomain, true)
    assert.equal(result.subdomain, 'portland')
    assert.equal(result.host, host)
  }
  assert.equal(getDomainInfo({ location: { host: 'newwww.biketag.org' } }).subdomain, 'newwww')
})

test('client API uses the current deployment while preserving development function URLs', (t) => {
  const previousWindow = global.window
  const previousStorage = global.localStorage
  t.after(() => {
    global.window = previousWindow
    global.localStorage = previousStorage
  })
  global.localStorage = { getItem: () => null }
  for (const [origin, apiPath, configuredGame] of [
    ['https://portland.biketag.org', '/api', undefined],
    ['https://6ae044d8edc4fa43bfbe308c--biketag-dev.netlify.app', '/api', undefined],
    ['https://deploy-preview-42--biketag-dev.netlify.app', '/api', 'portland'],
    ['http://localhost:8086', '/api', undefined],
    [
      'http://portland.localhost:8080',
      'http://portland.localhost:7200/.netlify/functions',
      undefined,
    ],
  ]) {
    global.window = { location: new URL(origin) }
    let options
    const { initBikeTagStore } = load('src/store/index.ts', {
      biketag: class {
        constructor(config) {
          options = config
        }
      },
      pinia: { defineStore: () => ({}) },
      '../common/submission-diagnostics': {},
      '../common/upload-recovery': {},
      '../common': {
        BikeTagEnv: { HOST: 'biketag.org', GAME_NAME: configuredGame },
        BikeTagDefaults: { gameName: '', store: 'biketag' },
        getDomainInfo,
        getApiUrl: () => apiPath,
        getBikeTagClientOpts: () => ({
          game: getDomainInfo(global.window).subdomain ?? configuredGame,
        }),
        getTokenFromCookie: () => '',
        getQueryParam: () => undefined,
        debug() {},
      },
    })
    initBikeTagStore()
    assert.equal(options.host, new URL(apiPath, origin).href)
    assert.equal(options.game, getDomainInfo(global.window).subdomain ?? configuredGame)
  }
})

function createGameStore(t) {
  const previousWindow = global.window
  const previousStorage = global.localStorage
  t.after(() => {
    global.window = previousWindow
    global.localStorage = previousStorage
  })
  global.window = { location: new URL('https://portland.biketag.org') }
  global.localStorage = { getItem: () => null }
  const fixture = { response: { success: false }, requests: [], contexts: [], tagRequests: [], tagsResponse: [] }
  const { initBikeTagStore, useBikeTagStore } = load('src/store/index.ts', {
    biketag: class {
      async getGame(...args) {
        fixture.requests.push(args)
        return fixture.response
      }
      setGameContext(game) {
        fixture.contexts.push(game)
        return game
      }
      async tags(...args) {
        fixture.tagRequests.push(args)
        return fixture.tagsResponse
      }
    },
    pinia: { defineStore: (_id, options) => options },
    '../common/submission-diagnostics': {},
    '../common/upload-recovery': {},
    '../common': {
      BikeTagEnv: {},
      BikeTagDefaults: { gameName: '', store: 'biketag' },
      getDomainInfo,
      getApiUrl: () => '/api',
      getBikeTagClientOpts: () => ({ imgur: {}, aws: {} }),
      getTokenFromCookie: () => '',
      getQueryParam: () => undefined,
      debug() {},
    },
  })
  initBikeTagStore()
  fixture.store = {
    ...useBikeTagStore.actions,
    gameName: 'portland',
    game: {},
    allGames: [],
    tags: [],
  }
  return fixture
}

test('landing-page startup does not look up a game without a name', async (t) => {
  const { store, requests } = createGameStore(t)
  for (const name of [undefined, null, '', '   ']) {
    store.gameName = name
    assert.equal(await store.setGame(), false)
    assert.equal(await store.setGame(''), false)
  }
  assert.equal(requests.length, 0)
  assert.deepEqual(store.game, {})
})

test('games without storage settings use the BikeTag API context default', async (t) => {
  const fixture = createGameStore(t)
  for (const settings of [undefined, null]) {
    fixture.store.game = {}
    fixture.response = {
      success: true,
      data: {
        name: 'portland',
        settings,
      },
    }
    const game = await fixture.store.setGame()
    assert.equal(game.name, 'portland')
    assert.deepEqual(game.settings, {})
    assert.equal(fixture.contexts.at(-1), fixture.response.data)
    assert.equal(fixture.requests.at(-1).length, 1)
  }
})

test('games with storage settings are passed to the API game context', async (t) => {
  const fixture = createGameStore(t)
  for (const settings of [
    { 'data::aws': 'true', 'data::imgur': 'true' },
    { 'data::aws': 'false', 'data::imgur': 'true' },
    { 'data::aws': 'false', 'data::imgur': 'false' },
  ]) {
    fixture.store.game = {}
    fixture.response = {
      success: true,
      data: {
        name: 'portland',
        mainhash: settings['data::imgur'] === 'true' ? 'main' : undefined,
        settings,
      },
    }
    const game = await fixture.store.setGame()
    assert.deepEqual(game.settings, settings)
    assert.equal(fixture.contexts.at(-1), fixture.response.data)
  }
})

test('game collections and missing game responses cannot replace the selected game', async (t) => {
  const fixture = createGameStore(t)
  for (const data of [undefined, null, {}, [], [{ name: 'portland' }]]) {
    fixture.response = { success: true, data }
    assert.equal(await fixture.store.setGame(), false)
    assert.deepEqual(fixture.store.game, {})
  }
  assert.equal(fixture.contexts.length, 0)

  fixture.store.allGames = [{ name: 'portland', mainhash: 'cached-main' }]
  const cachedGame = await fixture.store.setGame()
  assert.equal(cachedGame.name, 'portland')
  assert.deepEqual(cachedGame.settings, {})
  assert.equal(fixture.contexts.at(-1), fixture.store.allGames[0])
})

test('the home page only renders its player button when the player has a name', async () => {
  const filename = 'src/views/Home.vue'
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const source = compileScript(descriptor, {
    id: 'home-startup-test',
    inlineTemplate: true,
  }).content
  const emptyComponent = defineComponent({ render: () => h('div') })
  const button = defineComponent({
    props: ['text'],
    setup: (props) => () => h('button', props.text),
  })
  const store = { getCurrentBikeTag: {}, getTags: [], getImageSized: () => '' }
  const dependencies = {
    '@/store/index': { useBikeTagStore: () => store },
    'vue-router': { useRoute: () => ({ params: {} }), useRouter: () => ({}) },
    'vue-i18n': { useI18n: () => ({ t: (key) => key }) },
    'vue-loading-overlay/dist/css/index.css': {},
    'vue-loading-overlay': emptyComponent,
    '@/assets/images/SpinningBikeV1.svg': '/spinner.svg',
  }
  for (const name of [
    'BikeTag',
    'BikeTagButton',
    'BikeTagFooter',
    'BikeTagHeader',
    'BikeTagLabel',
    'ExpandableImage',
  ]) {
    dependencies[`@/components/${name}.vue`] = name === 'BikeTagButton' ? button : emptyComponent
  }
  const home = load(filename, dependencies, source).default
  for (const player of [undefined, '', '   ', 'A BikeTag Rider']) {
    store.getCurrentBikeTag = { mysteryPlayer: player }
    const app = createSSRApp(home)
    app.config.globalProperties.$t = (key) => key
    const html = await renderToString(app)
    if (player?.trim()) assert.match(html, />A BikeTag Rider<\/button>/)
    else assert.doesNotMatch(html, /play-screen__mystery-player__button/)
    assert.doesNotMatch(html, /<button[^>]*>\s*<\/button>/)
  }
})

test('concurrent game initialization shares a request and caches the loaded game', async (t) => {
  const fixture = createGameStore(t)
  let resolveGame
  fixture.response = new Promise((resolve) => {
    resolveGame = resolve
  })
  const first = fixture.store.setGame()
  const second = fixture.store.setGame()
  assert.equal(fixture.requests.length, 1)
  resolveGame({ success: true, data: { name: 'portland', mainhash: 'main' } })
  const [game, sameGame] = await Promise.all([first, second])
  assert.equal(game, sameGame)
  assert.equal(fixture.requests.length, 1)
  assert.equal(await fixture.store.setGame(), game)
  assert.equal(fixture.requests.length, 1)
})

test('concurrent tag fetches share a request without suppressing explicit refreshes', async (t) => {
  const fixture = createGameStore(t)
  let resolveTags
  fixture.tagsResponse = new Promise((resolve) => {
    resolveTags = resolve
  })
  const first = fixture.store.fetchTags()
  const second = fixture.store.fetchTags()
  assert.equal(fixture.tagRequests.length, 1)
  resolveTags([{ tagnumber: 42 }])
  assert.deepEqual(await first, [{ tagnumber: 42 }])
  assert.deepEqual(await second, [{ tagnumber: 42 }])
  await fixture.store.fetchTags(false)
  assert.equal(fixture.tagRequests.length, 2)
  assert.deepEqual(fixture.tagRequests[1][1], { cached: false })
})

test('PWA manifest waits for game state rather than initiating another game fetch', () => {
  const source = fs.readFileSync('src/components/ServiceWorker.vue', 'utf8')
  assert.doesNotMatch(source, /store\\.setGame\\(/)
  assert.match(source, /watch\\(\\s*\\(\\) => store\\.game\\?\\.name/)
  assert.match(source, /if \\(name\\) void updateManifest\\(\\)/)
})
