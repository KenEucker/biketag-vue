const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createRenderer, nextTick, reactive } = require('vue')

function load(filename, source, dependencies = {}) {
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = loaded.require.bind(loaded)
  loaded.require = (name) => dependencies[name] ?? originalRequire(name)
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

function element(tag, className = '', parent) {
  const result = {
    tag,
    className,
    children: [],
    listeners: {},
    addEventListener(event, callback) {
      this.listeners[event] = callback
    },
  }
  parent?.children.push(result)
  return result
}

const renderer = createRenderer({
  createElement: element,
  createText: () => element('text'),
  createComment: () => element('comment'),
  insert(child, parent) {
    parent.children.push(child)
  },
  remove() {},
  setText() {},
  setElementText() {},
  parentNode() {},
  nextSibling() {},
  patchProp() {},
})

function mountMap(tags = [], variant = 'biketags') {
  const store = reactive({
    getTags: tags,
    getAllGames: [],
    getGame: { boundary: { lat: 47.6, long: -122.3 } },
    getLogoUrl: () => '/logo.svg',
  })
  const map = {
    fits: [],
    setView() {
      return this
    },
    fitBounds(bounds, options) {
      this.fits.push({ bounds, options })
    },
    remove() {
      this.removed = true
    },
  }
  const groups = []
  const leaflet = {
    map: () => map,
    tileLayer: () => ({ addTo() {} }),
    featureGroup() {
      const group = {
        layers: [],
        addTo() {
          groups.push(this)
          return this
        },
        clearLayers() {
          this.layers = []
        },
        getBounds() {
          return this.layers.map((marker) => marker.point)
        },
      }
      return group
    },
    marker(point, options) {
      return {
        point,
        options,
        addTo(group) {
          group.layers.push(this)
          return this
        },
        bindPopup(content) {
          this.openPopup = content
          return this
        },
      }
    },
    Icon: class {
      constructor(options) {
        this.options = options
      }
    },
    control: { locate: () => ({ addTo() {} }) },
    DomUtil: { create: element },
  }
  const filename = path.resolve('src/components/BikeTagMap.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
  const script = compileScript(descriptor, { id: 'map-test', inlineTemplate: true })
  const imagesFile = path.resolve('src/common/images.ts')
  const component = load(filename, script.content, {
    '@/assets/images/pin.svg': '/pin.svg',
    '@/store/index': { useBikeTagStore: () => store },
    '@/common/images': load(imagesFile, fs.readFileSync(imagesFile, 'utf8')),
    leaflet,
    'leaflet.locatecontrol': {},
    'leaflet.locatecontrol/dist/L.Control.Locate.min.css': {},
    'leaflet/dist/leaflet.css': {},
  }).default
  const app = renderer.createApp(component, { variant })
  app.mount(element('root'))
  return { store, map, groups, app }
}

const tag = (tagnumber, gps = { lat: 47.6, long: -122.3 }) => ({
  tagnumber,
  gps,
  mysteryImageUrl: `https://seattle-biketag.sfo2.cdn.digitaloceanspaces.com/main/tag-${tagnumber}--mystery.webp`,
  foundImageUrl: `https://i.imgur.com/found${tagnumber}.jpg`,
  foundLocation: 'Park entrance',
})

test('renders pins when tags arrive after the map mounts and fits their locations', async (t) => {
  const { store, map, groups, app } = mountMap()
  t.after(() => app.unmount())
  assert.equal(groups[0].layers.length, 0)
  store.getTags = [tag(1), tag(2, { lat: 45.5, lng: -122.6 })]
  await nextTick()
  assert.deepEqual(
    groups[0].layers.map((marker) => marker.point),
    [
      [47.6, -122.3],
      [45.5, -122.6],
    ],
  )
  assert.deepEqual(map.fits[0].bounds, [
    [47.6, -122.3],
    [45.5, -122.6],
  ])
})

test('skips absent, unset and invalid GPS without hiding valid pins', (t) => {
  const invalid = [
    undefined,
    null,
    {},
    { lat: 0, long: 0 },
    { lat: null, long: -122 },
    { lat: 48 },
    { lat: '', long: 10 },
    { lat: 'bad', lng: 10 },
    { lat: 91, long: 10 },
    { lat: 48, lng: 181 },
    { lat: NaN, long: 10 },
    { lat: 48, long: Infinity },
    { lat: false, long: 10 },
  ]
  const tags = invalid.map((gps, index) => ({ ...tag(index), gps }))
  tags.push(
    tag(20, { lat: 0, long: 20 }),
    tag(21, { lat: 10, lng: 0 }),
    tag(22, { lat: '48', long: '-123' }),
  )
  const { groups, app } = mountMap(tags)
  t.after(() => app.unmount())
  assert.deepEqual(
    groups[0].layers.map((marker) => marker.point),
    [
      [0, 20],
      [10, 0],
      [48, -123],
    ],
  )
})

test('updates and removes pins without duplicates or resetting the user view', async (t) => {
  const { store, map, groups, app } = mountMap([tag(1), tag(2)])
  t.after(() => app.unmount())
  store.getTags[0].gps.lat = 48
  store.getTags.push(tag(3))
  await nextTick()
  assert.equal(groups[0].layers.length, 3)
  assert.deepEqual(groups[0].layers[0].point, [48, -122.3])
  store.getTags = [tag(2)]
  await nextTick()
  assert.equal(groups[0].layers.length, 1)
  assert.equal(groups[0].layers[0].options.title, 'BikeTag #2')
  assert.equal(map.fits.length, 1)
  store.getTags = []
  await nextTick()
  assert.equal(groups[0].layers.length, 0)
})

test('pin popup shows both small photos, location and a link to the correct tag', (t) => {
  const item = tag(42)
  item.foundLocation = '<img src=x onerror=alert(1)>'
  const { groups, app } = mountMap([item])
  t.after(() => app.unmount())
  const popup = groups[0].layers[0].openPopup()
  const [link, location, photos] = popup.children
  assert.equal(link.textContent, 'BikeTag #42')
  assert.equal(link.href, '/42')
  assert.equal(location.textContent, item.foundLocation)
  assert.equal(location.children.length, 0)
  const [mystery, found] = photos.children.map((figure) => figure.children[0])
  assert.equal(mystery.src, item.mysteryImageUrl.replace('.webp', '_small.webp'))
  assert.equal(found.src, 'https://i.imgur.com/found42s.jpg')
  assert.equal(mystery.alt, 'Mystery photo for BikeTag #42')
  assert.equal(found.alt, 'Found photo for BikeTag #42')
  mystery.listeners.error()
  assert.equal(mystery.src, item.mysteryImageUrl)
})

test('popups tolerate missing photos', (t) => {
  const item = { ...tag(1), foundImageUrl: undefined, foundLocation: '' }
  const { groups, app } = mountMap([item])
  t.after(() => app.unmount())
  const popup = groups[0].layers[0].openPopup()
  assert.equal(popup.children[1].children.length, 1)
})

test('worldwide game markers still load asynchronously without duplicates', async (t) => {
  const { store, groups, app } = mountMap([], 'worldwide')
  t.after(() => app.unmount())
  store.getAllGames = [{ boundary: { lat: 47, long: -122 } }, {}]
  await nextTick()
  assert.deepEqual(
    groups[0].layers.map((marker) => marker.point),
    [[47, -122]],
  )
  store.getAllGames = [{ boundary: { lat: 49, lng: -123 } }]
  await nextTick()
  assert.deepEqual(
    groups[0].layers.map((marker) => marker.point),
    [[49, -123]],
  )
})

test('unmount removes the Leaflet map and stops reacting to tag changes', async () => {
  const { store, map, groups, app } = mountMap([tag(1)])
  app.unmount()
  assert.equal(map.removed, true)
  store.getTags = [tag(2), tag(3)]
  await nextTick()
  assert.equal(groups[0].layers.length, 1)
})
