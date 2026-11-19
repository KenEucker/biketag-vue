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

function mountMap(tags = [], variant = 'biketags', token = 'public-test-token', options = {}) {
  const store = reactive({
    getTags: tags,
    getAllGames: [],
    getGame: options.game ?? { boundary: { lat: 47.6, long: -122.3 } },
    getLogoUrl: () => '/logo.svg',
    getRegionPolygon: options.getRegionPolygon ?? (async () => undefined),
  })
  const map = {
    fits: [],
    views: [],
    invalidations: [],
    listeners: {},
    on(event, listener) {
      this.listeners[event] = listener
      return this
    },
    initialized: false,
    invalidateSize(options) {
      this.invalidations.push(options)
    },
    setView(center, zoom) {
      this.views.push({ center, zoom })
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
  const tiles = []
  const markers = []
  const events = []
  const leaflet = {
    map: () => {
      map.initialized = true
      return map
    },
    tileLayer(url, options) {
      return {
        url,
        options,
        listeners: {},
        on(event, listener) {
          this.listeners[event] = listener
          return this
        },
        addTo() {
          tiles.push(this)
          return this
        },
      }
    },
    geoJSON(paths) {
      return {
        paths,
        addTo() {
          return this
        },
        getBounds() {
          return 'region-bounds'
        },
      }
    },
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
      const marker = {
        point,
        options,
        setLatLng(point) {
          this.point = point
          return this
        },
        addTo(group) {
          group.layers ??= []
          group.layers.push(this)
          return this
        },
        bindPopup(content) {
          this.openPopup = content
          return this
        },
        on(event, listener) {
          this.listeners ??= {}
          this.listeners[event] = listener
          return this
        },
      }
      markers.push(marker)
      return marker
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
    '@/common/constants': { BikeTagEnv: { LOQ_AKEY: token } },
    '@/common/images': load(imagesFile, fs.readFileSync(imagesFile, 'utf8')),
    leaflet,
    'leaflet.locatecontrol': {},
    'leaflet.locatecontrol/dist/L.Control.Locate.min.css': {},
    'leaflet/dist/leaflet.css': {},
  }).default
  const app = renderer.createApp(component, {
    variant,
    start: options.start ?? null,
    gps: options.gps ?? null,
    onDragend: (gps) => events.push(gps),
  })
  app.mount(element('root'))
  return { store, map, groups, tiles, markers, events, app }
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

test('uses LocationIQ streets tiles with attribution and all three subdomains', (t) => {
  const { tiles, app } = mountMap([], 'worldwide', 'pk.test-token&sample')
  t.after(() => app.unmount())
  assert.equal(tiles.length, 1)
  assert.equal(
    tiles[0].url,
    'https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=pk.test-token%26sample',
  )
  assert.deepEqual(tiles[0].options.subdomains, ['a', 'b', 'c'])
  assert.equal(tiles[0].options.maxZoom, 20)
  assert.match(tiles[0].options.attribution, /LocationIQ/)
  assert.match(tiles[0].options.attribution, /OpenStreetMap contributors/)
})

test('shows an unavailable map instead of requesting tiles without an API token', (t) => {
  const { map, tiles, app } = mountMap([], 'biketags', '')
  t.after(() => app.unmount())
  assert.equal(map.initialized, false)
  assert.equal(tiles.length, 0)
})

test('tile errors report the map variant once without exposing the token in logs', (t) => {
  const originalWarn = console.warn
  const warnings = []
  console.warn = (...parts) => warnings.push(parts)
  t.after(() => {
    console.warn = originalWarn
  })
  const { tiles, app } = mountMap([], 'biketags', 'public-secret-test-token')
  t.after(() => app.unmount())
  const error = { coords: { z: 15 }, tile: { src: tiles[0].url } }
  tiles[0].listeners.tileerror(error)
  tiles[0].listeners.tileerror(error)
  assert.equal(warnings.length, 1)
  assert.deepEqual(warnings[0][1], { variant: 'biketags', zoom: 15 })
  assert.ok(!JSON.stringify(warnings).includes('public-secret-test-token'))
})

test('recalculates tile coverage when a hidden map becomes visible and disconnects on unmount', (t) => {
  const previousObserver = global.ResizeObserver
  let callback
  let observed
  let disconnectCount = 0
  global.ResizeObserver = class {
    constructor(handler) {
      callback = handler
    }
    observe(target) {
      observed = target
    }
    disconnect() {
      disconnectCount += 1
    }
  }
  t.after(() => {
    if (previousObserver === undefined) delete global.ResizeObserver
    else global.ResizeObserver = previousObserver
  })
  const { map, app } = mountMap([], 'play/input')
  assert.ok(observed)
  callback([{ contentRect: { width: 0, height: 500 } }])
  assert.equal(map.invalidations.length, 0)
  callback([{ contentRect: { width: 320, height: 500 } }])
  assert.deepEqual(map.invalidations, [{ pan: false }])
  app.unmount()
  assert.equal(disconnectCount, 1)
})

test('boundary map centers on its game even when there is no region polygon', (t) => {
  const center = { lat: 45.52, long: -122.67 }
  const { map, app } = mountMap([], 'boundary', 'test-token', {
    game: { boundary: center },
  })
  t.after(() => app.unmount())
  assert.deepEqual(map.views.at(-1), { center: [45.52, -122.67], zoom: 10 })
  assert.equal(map.fits.length, 0)
})

test('boundary map centers when game data arrives after initial mount', async (t) => {
  const { store, map, app } = mountMap([], 'boundary', 'test-token', { game: {} })
  t.after(() => app.unmount())
  assert.deepEqual(map.views[0], { center: [40, -45], zoom: 3 })

  store.getGame = { boundary: { lat: 45.52, lng: -122.67 } }
  await nextTick()
  assert.deepEqual(map.views.at(-1), { center: [45.52, -122.67], zoom: 10 })

  const count = map.views.length
  store.getGame.otherSetting = 'unchanged location'
  store.getGame.boundary.lat = 45.53
  await nextTick()
  assert.equal(map.views.length, count, 'a refresh must not reset the user view')
})

test('boundary map fits its region polygon when the region loads later', async (t) => {
  const requests = []
  const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
  const { store, map, app } = mountMap([], 'boundary', 'test-token', {
    game: {},
    getRegionPolygon: async (region) => {
      requests.push(region.description)
      return { geojson: polygon }
    },
  })
  t.after(() => app.unmount())

  store.getGame = {
    boundary: { lat: 45.52, long: -122.67 },
    region: { description: 'Portland, Oregon' },
  }
  await nextTick()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(requests, ['Portland, Oregon'])
  assert.deepEqual(map.fits.map((fit) => fit.bounds), ['region-bounds'])

  const count = map.views.length
  store.getGame.boundary.lat = 45.53
  await nextTick()
  assert.equal(map.views.length, count, 'late boundary updates must not undo polygon fit')
})

test('tag map uses a late game center but does not override fitted tag bounds', async (t) => {
  const { store, map, app } = mountMap([], 'biketags', 'test-token', { game: {} })
  t.after(() => app.unmount())
  store.getGame = { boundary: { lat: 45.52, long: -122.67 } }
  await nextTick()
  assert.deepEqual(map.views.at(-1), { center: [45.52, -122.67], zoom: 10 })

  store.getTags = [tag(1)]
  await nextTick()
  assert.equal(map.fits.length, 1)
  const count = map.views.length
  store.getGame.boundary.lat = 48
  await nextTick()
  assert.equal(map.views.length, count, 'tag fit should not be overridden')
})

test('input map rejects (0, 0) and uses the game center for its initial pin', (t) => {
  const { map, markers, app } = mountMap([], 'play/input', 'test-token', {
    start: { lat: 0, lng: 0 },
    game: { boundary: { lat: 45.52, long: -122.67 } },
  })
  t.after(() => app.unmount())
  assert.equal(markers.length, 1)
  assert.deepEqual(markers[0].point, [45.52, -122.67])
  assert.deepEqual(map.views.at(-1), { center: [45.52, -122.67], zoom: 12 })
})

test('input map prefers real photo GPS over the game boundary', (t) => {
  const { markers, app } = mountMap([], 'play/input', 'test-token', {
    start: { lat: 47.6, lng: -122.3 },
    game: { boundary: { lat: 45.52, long: -122.67 } },
  })
  t.after(() => app.unmount())
  assert.deepEqual(markers.map((marker) => marker.point), [[47.6, -122.3]])
})

test('input map without known GPS does not invent a (0, 0) pin; clicking places one', (t) => {
  const { map, markers, events, app } = mountMap([], 'play/input', 'test-token', {
    start: { lat: 0, lng: 0 },
    game: {},
  })
  t.after(() => app.unmount())
  assert.equal(markers.length, 0)
  assert.deepEqual(map.views[0], { center: [40, -45], zoom: 3 })
  map.listeners.click({ latlng: { lat: 45.53, lng: -122.65 } })
  assert.deepEqual(markers.map((marker) => marker.point), [[45.53, -122.65]])
  assert.deepEqual(events, [{ lat: 45.53, lng: -122.65 }])
})

test('input map adds its marker when game coordinates load later', async (t) => {
  const { store, map, markers, app } = mountMap([], 'play/input', 'test-token', {
    game: {},
  })
  t.after(() => app.unmount())
  assert.equal(markers.length, 0)
  store.getGame = { boundary: { lat: 45.52, long: -122.67 } }
  await nextTick()
  assert.deepEqual(markers.map((marker) => marker.point), [[45.52, -122.67]])
  assert.deepEqual(map.views.at(-1), { center: [45.52, -122.67], zoom: 12 })
})

test('input map starts zoomed out without changing the tag-map fit zoom', (t) => {
  const input = mountMap([], 'play/input', 'test-token', {
    start: { lat: 45.52, lng: -122.67 },
  })
  t.after(() => input.app.unmount())
  assert.deepEqual(input.map.views.at(-1), { center: [45.52, -122.67], zoom: 12 })

  const tags = mountMap([tag(1)])
  t.after(() => tags.app.unmount())
  assert.equal(tags.map.fits[0].options.maxZoom, 15)
})
