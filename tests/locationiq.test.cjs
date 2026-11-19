const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createRenderer, defineComponent, h, nextTick, reactive } = require('vue')

function loadComponent(apiKey) {
  const filename = path.resolve('src/components/LocationAutocomplete.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
  const script = compileScript(descriptor, { id: 'locationiq-test', inlineTemplate: true })
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = loaded.require.bind(loaded)
  loaded.require = (name) =>
    name === '@/common/constants'
      ? { BikeTagEnv: { LOCATIONIQ_API_KEY: apiKey } }
      : originalRequire(name)
  loaded._compile(
    ts.transpileModule(script.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  )
  return loaded.exports.default
}

function element(type) {
  return { type, props: {}, children: [], parent: null }
}

const renderer = createRenderer({
  createElement: element,
  createText: () => element('text'),
  createComment: () => element('comment'),
  insert(child, parent, anchor) {
    if (child.parent) {
      const oldIndex = child.parent.children.indexOf(child)
      if (oldIndex !== -1) child.parent.children.splice(oldIndex, 1)
    }
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index === -1) parent.children.push(child)
    else parent.children.splice(index, 0, child)
  },
  remove(child) {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index !== -1) child.parent.children.splice(index, 1)
    child.parent = null
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode: (node) => node.parent,
  nextSibling: () => null,
  patchProp(node, key, _previous, value) {
    node.props[key] = value
  },
})

function find(root, predicate) {
  if (predicate(root)) return root
  for (const child of root.children) {
    const result = find(child, predicate)
    if (result) return result
  }
  return null
}

function mount(apiKey) {
  const state = reactive({ value: '', disabled: false })
  const selected = []
  const component = loadComponent(apiKey)
  const root = element('root')
  const parent = defineComponent({
    setup() {
      return () =>
        h(component, {
          modelValue: state.value,
          disabled: state.disabled,
          'onUpdate:modelValue': (value) => {
            state.value = value
          },
          onSelect: (value) => selected.push(value),
        })
    },
  })
  const app = renderer.createApp(parent)
  app.mount(root)
  const input = () => find(root, (node) => node.type === 'input')
  const option = () => find(root, (node) => node.props.role === 'option')
  return { app, input, option, state, selected, root }
}

const place = {
  place_id: '123',
  display_name: 'Pioneer Square, Portland, Oregon',
  display_place: 'Pioneer Square',
  lat: '45.5181',
  lon: '-122.6794',
}

test('debounces autocomplete and selects coordinates without rewriting manually typed text', async (t) => {
  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, json: async () => [place, { ...place, lat: 'bad', place_id: '2' }] }
  }
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token')
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  view.input().props.onInput({ target: { value: 'Pioneer Square' } })
  assert.equal(view.state.value, 'Pioneer Square')
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  assert.equal(calls.length, 1)
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/v1/autocomplete')
  assert.equal(url.searchParams.get('key'), 'public-token')
  assert.equal(url.searchParams.get('q'), 'Pioneer Square')
  assert.equal(view.option().text, place.display_name)
  view.option().props.onClick()
  await nextTick()
  assert.equal(view.state.value, 'Pioneer Square')
  assert.deepEqual(view.selected, [{ lat: 45.5181, lng: -122.6794 }])
  assert.equal(view.option(), null)
})

test('without a configured token the field remains a manual text input', async (t) => {
  const view = mount(null)
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Trailhead near the bridge' } })
  await nextTick()
  assert.equal(view.state.value, 'Trailhead near the bridge')
  assert.equal(view.option(), null)
})

test('stale requests do not replace current suggestions after typing changes', async (t) => {
  let finish
  const originalFetch = global.fetch
  global.fetch = () => new Promise((resolve) => {
    finish = resolve
  })
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token')
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Old location' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  view.input().props.onInput({ target: { value: 'New location' } })
  finish({ ok: true, json: async () => [place] })
  await nextTick()
  assert.equal(view.option(), null)
})

test('API failure leaves manual entry available', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({ ok: false, status: 429 })
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token')
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Bridge Park' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  assert.equal(view.state.value, 'Bridge Park')
  assert.ok(find(view.root, (node) => node.props.role === 'status'))
})
