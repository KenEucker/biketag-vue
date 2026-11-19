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
      ? { BikeTagEnv: { LOQ_AKEY: apiKey } }
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

function mount(apiKey, options = {}) {
  const state = reactive({
    value: '',
    disabled: false,
    searchCenter: options.searchCenter ?? null,
    postalCode: options.postalCode ?? '',
    gameCity: options.gameCity ?? '',
  })
  const selected = []
  const component = loadComponent(apiKey)
  const root = element('root')
  const parent = defineComponent({
    setup() {
      return () =>
        h(component, {
          modelValue: state.value,
          disabled: state.disabled,
          searchCenter: state.searchCenter,
          postalCode: state.postalCode,
          gameCity: state.gameCity,
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

test('biases autocomplete toward the game center without restricting other ZIP codes', async (t) => {
  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url) => {
    calls.push(new URL(url))
    return { ok: true, json: async () => [place] }
  }
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token', {
    searchCenter: { lat: 45.52, lng: -122.67 },
    postalCode: '97205',
  })
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer Square' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  assert.equal(calls.length, 1)
  const params = calls[0].searchParams
  assert.equal(params.get('q'), 'Pioneer Square', 'ZIP code must not be appended to search text')
  assert.equal(params.get('bounded'), '0', 'geographic bias must not exclude other areas')
  assert.equal(params.get('importancesort'), '0', 'prioritize distance to the game, not global prominence')
  assert.equal(params.get('limit'), '10', 'include more nearby candidates for ZIP matching')
  const bounds = params.get('viewbox').split(',').map(Number)
  assert.equal(bounds.length, 4)
  assert.ok(bounds[0] < -122.67 && bounds[2] > -122.67)
  assert.ok(bounds[1] < 45.52 && bounds[3] > 45.52)
})

test('prioritizes matching ZIP results while still showing other locations', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => [
      { ...place, place_id: 'other', display_name: 'Pioneer Square elsewhere', address: { postcode: '10018' } },
      { ...place, place_id: 'local', display_name: 'Pioneer Square nearby', address: { postcode: '97205' } },
    ],
  })
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token', { postalCode: '97205' })
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  assert.equal(view.option().text, 'Pioneer Square nearby')
  assert.equal(
    find(view.root, (node) => node.props.role === 'listbox')?.children.length,
    2,
    'nonmatching ZIP codes must remain selectable',
  )
})

test('ignores invalid game coordinates rather than biasing toward zero', async (t) => {
  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url) => {
    calls.push(new URL(url))
    return { ok: true, json: async () => [] }
  }
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token', {
    searchCenter: { lat: 0, lng: 0 },
  })
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  assert.equal(calls[0].searchParams.has('viewbox'), false)
  assert.equal(calls[0].searchParams.has('importancesort'), false)
})

test('updates location bias when the game loads after typing has started', async (t) => {
  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url) => {
    calls.push(new URL(url))
    return { ok: true, json: async () => [place] }
  }
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token')
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  view.state.searchCenter = { lat: 45.52, long: -122.67 }
  view.state.postalCode = '97205'
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 400))
  assert.equal(calls.length, 2)
  assert.equal(calls[0].searchParams.has('viewbox'), false)
  assert.ok(calls[1].searchParams.has('viewbox'))
  assert.equal(calls[1].searchParams.get('importancesort'), '0')
})

test('a selected place is retained when game search hints update', async (t) => {
  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url) => {
    calls.push(new URL(url))
    return { ok: true, json: async () => [place] }
  }
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token')
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  view.option().props.onClick()
  await nextTick()
  assert.equal(view.state.value, 'Pioneer Square')

  view.state.searchCenter = { lat: 45.52, lng: -122.67 }
  view.state.postalCode = '97205'
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 400))
  assert.equal(view.state.value, 'Pioneer Square')
  assert.equal(calls.length, 1, 'changing hints should not reopen a selected search')
})

test('shows only the place name for a result in the game city and full addresses elsewhere', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => [
      {
        ...place,
        address: { city: 'Portland', state: 'Oregon', postcode: '97205' },
        display_name: 'Pioneer Square, 5th Avenue, Portland, Oregon, 97205, USA',
      },
      {
        ...place,
        place_id: 'out-of-state',
        lat: '43.6591',
        lon: '-70.2568',
        address: { city: 'Portland', state: 'Maine', postcode: '04101' },
        display_name: 'Pioneer Square, Portland, Maine, 04101, USA',
      },
      {
        ...place,
        place_id: 'another-city',
        address: { city: 'Beaverton', state: 'Oregon', postcode: '97005' },
        display_name: 'Pioneer Square, Beaverton, Oregon, 97005, USA',
      },
    ],
  })
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token', {
    gameCity: 'Portland',
    searchCenter: { lat: 45.52, lng: -122.67 },
  })
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  const options = find(view.root, (node) => node.props.role === 'listbox').children
  assert.deepEqual(
    options.map((option) => option.text),
    [
      'Pioneer Square',
      'Pioneer Square, Portland, Maine, 04101, USA',
      'Pioneer Square, Beaverton, Oregon, 97005, USA',
    ],
  )
  options[0].props.onClick()
  await nextTick()
  assert.equal(view.state.value, 'Pioneer Square')
  assert.deepEqual(view.selected, [{ lat: 45.5181, lng: -122.6794 }])
})

test('keeps the full address when the game city or trustworthy coordinates are unavailable', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => [{
      ...place,
      address: { town: 'Portland' },
      display_name: 'Pioneer Square, Portland, Oregon, 97205, USA',
    }],
  })
  t.after(() => {
    global.fetch = originalFetch
  })
  const view = mount('public-token', { gameCity: 'Portland' })
  t.after(() => view.app.unmount())
  view.input().props.onInput({ target: { value: 'Pioneer' } })
  await new Promise((resolve) => setTimeout(resolve, 400))
  await nextTick()
  assert.equal(view.option().text, 'Pioneer Square, Portland, Oregon, 97205, USA')
  view.state.searchCenter = { lat: 45.52, long: -122.67 }
  await nextTick()
  assert.equal(view.option().text, 'Pioneer Square', 'town can identify the local city')
})
