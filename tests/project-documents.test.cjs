const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createSSRApp, defineComponent, effectScope, h, nextTick, reactive } = require('vue')
const { renderToString } = require('@vue/server-renderer')
const vueRouter = require('vue-router')

function load(relativePath, dependencies, source = fs.readFileSync(relativePath, 'utf8')) {
  const filename = path.resolve(relativePath)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const localRequire = loaded.require.bind(loaded)
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.endsWith('.vue')) return { name }
    return localRequire(name)
  }
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

function section(t, initialProps, get) {
  const filename = 'src/components/SectionContent.vue'
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const source = compileScript(descriptor, { id: 'project-documents-test' }).content
  const component = load(filename, { axios: { get }, 'vue3-markdown-it': {} }, source).default
  const props = reactive({ filename: '', content: null, ...initialProps })
  const scope = effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => component.setup(props, { expose() {} }))
  return { props, state, stop: () => scope.stop() }
}

test('project documents have public routes and aliases backed by bundled files', async () => {
  const router = load('src/router/index.ts', {
    '@auth0/auth0-vue': { authGuard: () => assert.fail('documents must be public') },
    '../common': { debug() {}, isAuthenticationEnabled: () => false },
    'vue-router': { ...vueRouter, createWebHistory: vueRouter.createMemoryHistory },
  }).default
  for (const [url, name, filename] of [
    ['/privacy', 'Privacy', 'docs/privacy_policy.html'],
    ['/privacy-policy', 'Privacy', 'docs/privacy_policy.html'],
    ['/terms', 'Terms', 'docs/terms_of_service.md'],
    ['/terms-of-service', 'Terms', 'docs/terms_of_service.md'],
    ['/code-of-conduct', 'Code of Conduct', 'docs/code_of_conduct.md'],
  ]) {
    await router.push(url)
    assert.equal(router.currentRoute.value.name, name, url)
    const record = router.currentRoute.value.matched[0]
    assert.equal(record.beforeEnter, undefined)
    assert.equal(record.components.default.name, '@/views/ProjectDocument.vue')
    assert.equal(record.props.default.filename, filename)
    assert.ok(fs.readFileSync(path.join('public', filename), 'utf8').length > 100)
  }
})

test('landing-page document links stay within the application', async () => {
  const filename = 'src/views/Landing.vue'
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const source = compileScript(descriptor, {
    id: 'landing-documents-test',
    inlineTemplate: true,
  }).content
  const empty = defineComponent({ render: () => h('div') })
  const landing = load(
    filename,
    {
      '@/assets/images/biketag-ambassador.svg': '',
      '@/assets/images/BikeTag.svg': '',
      '@/common': {},
      'vue-i18n': { useI18n: () => ({ t: (key) => key }) },
      '@/components/BikeTagBlurb': defineComponent({
        setup:
          (_props, { slots }) =>
          () =>
            h('section', slots.default?.()),
      }),
      '@/components/BikeTagGames.vue': empty,
      '@/components/BikeTagMap.vue': empty,
    },
    source,
  ).default
  const router = vueRouter.createRouter({
    history: vueRouter.createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: empty }],
  })
  await router.push('/')
  const html = await renderToString(createSSRApp(landing).use(router))
  assert.match(html, /href="\/privacy"[^>]*>PRIVACY POLICY<\/a>/)
  assert.match(html, /href="\/terms"[^>]*>TERMS OF SERVICE<\/a>/)
  assert.match(html, /href="\/code-of-conduct"[^>]*>CODE OF CONDUCT<\/a>/)
  assert.match(html, /href="\/terms"[^>]*>You can read those here\.<\/a>/)
})

test('documents load from the site root and switch between HTML and Markdown', async (t) => {
  const requests = []
  const { props, state } = section(t, { filename: 'docs/privacy_policy.html' }, async (url) => {
    requests.push(url)
    return { data: fs.readFileSync(path.join('public', url), 'utf8') }
  })
  await nextTick()
  assert.deepEqual(requests, ['/docs/privacy_policy.html'])
  assert.match(state.html.value, /PRIVACY NOTICE/)
  assert.equal(state.mkdown.value, '')

  props.filename = 'docs/terms_of_service.md'
  await nextTick()
  await nextTick()
  assert.equal(requests.at(-1), '/docs/terms_of_service.md')
  assert.equal(state.html.value, '')
  assert.match(state.mkdown.value, /^# Intent/)

  props.filename = ''
  props.content = 'Choose a document'
  await nextTick()
  assert.equal(state.mkdown.value, 'Choose a document')
  assert.equal(requests.length, 2)
})

test('late responses cannot overwrite the newly selected document', async (t) => {
  const responses = []
  const { props, state, stop } = section(
    t,
    { filename: 'docs/privacy_policy.html' },
    () => new Promise((resolve) => responses.push(resolve)),
  )
  props.filename = 'docs/terms_of_service.md'
  await nextTick()
  responses[1]({ data: '# Terms' })
  await nextTick()
  responses[0]({ data: '<p>Old privacy document</p>' })
  await nextTick()
  assert.equal(state.html.value, '')
  assert.equal(state.mkdown.value, '# Terms')

  props.filename = 'docs/privacy_policy.html'
  await nextTick()
  stop()
  responses[2]({ data: '<p>Unmounted document</p>' })
  await nextTick()
  assert.equal(state.html.value, '')
})

test('failed document requests show an error and recover on the next selection', async (t) => {
  const { props, state } = section(t, { filename: 'docs/missing.md' }, async (url) => {
    if (url === '/docs/missing.md') throw new Error('Not found')
    return { data: '# Terms' }
  })
  await nextTick()
  assert.equal(state.error.value, true)
  assert.equal(state.html.value, '')
  assert.equal(state.mkdown.value, '')

  props.filename = 'docs/terms_of_service.md'
  await nextTick()
  await nextTick()
  assert.equal(state.error.value, false)
  assert.equal(state.mkdown.value, '# Terms')
})
