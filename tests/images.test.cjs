/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const sharp = require('sharp')
const s3 = require('@aws-sdk/client-s3')
const { BikeTagClient } = require('biketag')

function loadTs(relativePath, overrides = {}, cache = new Map()) {
  const filename = path.resolve(relativePath)
  if (cache.has(filename)) return cache.get(filename).exports
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  cache.set(filename, loaded)
  const localRequire = Module.createRequire(filename)
  loaded.require = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name]
    const target = path.resolve(path.dirname(filename), name)
    for (const ext of ['.ts', '.mts']) {
      if (name.startsWith('.') && fs.existsSync(target + ext))
        return loadTs(target + ext, overrides, cache)
    }
    return localRequire(name)
  }
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
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

const { readImageMetadata } = loadTs('src/common/image-metadata.ts')

// Two visibly different frames, with timing and looping to check during conversion.
const animatedGif = () =>
  sharp(
    Buffer.from([
      255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255,
    ]),
    {
      raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
    },
  )
    .gif({ loop: 0, delay: [100, 200] })
    .toBuffer()

test('GIF selection succeeds without EXIF metadata', async () => {
  const gif = await animatedGif()
  assert.equal(await readImageMetadata(new Blob([gif], { type: 'image/gif' })), undefined)
})

test('JPEG capture dates are still read', async () => {
  const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } })
    .jpeg()
    .withExif({
      IFD2: { DateTimeOriginal: '2026:10:18 12:34:56' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '45/1 31/1 0/1',
        GPSLongitudeRef: 'W',
        GPSLongitude: '122/1 40/1 0/1',
      },
    })
    .toBuffer()
  const metadata = await readImageMetadata(new Blob([jpeg], { type: 'image/jpeg' }))
  assert.ok(metadata.DateTimeOriginal instanceof Date)
  assert.equal(metadata.DateTimeOriginal.getFullYear(), 2026)
  assert.equal(metadata.latitude, 45 + 31 / 60)
  assert.equal(metadata.longitude, -(122 + 40 / 60))
})

test('image read failures are reported instead of treated as missing metadata', async () => {
  const error = new Error('Unable to read file')
  await assert.rejects(
    readImageMetadata({
      arrayBuffer: async () => {
        throw error
      },
    }),
    error,
  )
})

test('browser uploads send the original GIF bytes and MIME type to the signed URL', async (t) => {
  const previousWindow = global.window
  global.window = {}
  t.after(() => {
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  })
  const gif = await animatedGif()
  const client = new BikeTagClient({
    game: 'test',
    host: 'https://example.test/api',
    aws: { region: 'nyc3', accessKeyId: 'test', secretAccessKey: 'test' },
    cached: false,
  })
  const requests = []
  client.request = async (options) => {
    requests.push(options)
    return { status: 200, data: 'https://example.test/signed' }
  }
  client.plainFetcher = async (url, options) => {
    requests.push({ url, ...options })
    return { status: 200 }
  }
  const result = await client.uploadTagImage(
    {
      game: 'test',
      tagnumber: 1,
      playerId: 'test',
      foundPlayer: 'Tester',
      contentType: 'image/gif',
      foundImage: new Blob([gif], { type: 'image/gif' }),
    },
    { source: 'aws' },
  )
  assert.equal(result.success, true)
  assert.equal(requests.length, 2)
  assert.ok(requests[0].url.endsWith('/token'))
  assert.equal(requests[0].data.contentType, 'image/gif')
  assert.ok(requests[0].data.key.endsWith('.gif'))
  assert.equal(requests[1].url, 'https://example.test/signed')
  assert.equal(requests[1].method, 'PUT')
  assert.equal(requests[1].headers['Content-Type'], 'image/gif')
  assert.deepEqual(Buffer.from(requests[1].data), gif)
  assert.ok(requests[1].headers['x-amz-meta-data'])
})

test('resize preserves GIF frames, timing, and looping in WebP variants', async () => {
  const gif = await animatedGif()
  const resize = loadTs('functions/resize.mts', {
    axios: { get: async () => ({ data: gif }) },
    './common/methods': {
      getPayloadOpts: async () => ({ url: 'https://example.test/tag.gif', width: '1' }),
      acceptCorsHeaders: () => ({}),
      log: () => {},
    },
  }).default
  const response = await resize(new Request('https://example.test/api/resize'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Type'), 'image/webp')
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
  assert.equal(metadata.width, 1)
  assert.equal(metadata.pages, 2)
  assert.deepEqual(metadata.delay, [100, 200])
  assert.equal(metadata.loop, 0)
})

test('publishing a queued GIF preserves animation and storage metadata', async () => {
  const gif = await animatedGif()
  const key = 'queue/test-tag-1--found--player.gif'
  const sourceMetadata = { data: 'tag-metadata' }
  const objects = new Map([[key, { Body: gif, Metadata: sourceMetadata }]])
  const methods = loadTs('functions/common/methods.ts', {
    '@atproto/api': {},
    biketag: {},
    jose: {},
    './email': {},
    '@aws-sdk/client-s3': {
      ...s3,
      S3Client: class {
        async send(command) {
          const { Key, Body, Metadata, ContentType } = command.input
          if (command instanceof s3.HeadObjectCommand) {
            if (objects.has(Key)) return objects.get(Key)
            throw Object.assign(new Error('Missing'), { $metadata: { httpStatusCode: 404 } })
          }
          if (command instanceof s3.GetObjectCommand) {
            const object = objects.get(Key)
            return { ...object, Body: { transformToByteArray: async () => object.Body } }
          }
          if (command instanceof s3.PutObjectCommand) {
            objects.set(Key, { Body, Metadata, ContentType })
            return {}
          }
          if (command instanceof s3.DeleteObjectCommand) {
            objects.delete(Key)
            return {}
          }
          throw new Error(`Unexpected storage command: ${command.constructor.name}`)
        }
      },
    },
  })
  const url = await methods.moveQueueImageToMainWithVariants(
    'test',
    'nyc3',
    `https://test-biketag.nyc3.cdn.digitaloceanspaces.com/${key}`,
    1,
    'found',
  )
  assert.ok(url.endsWith('/main/test-tag-1--found.webp'))
  const published = objects.get('main/test-tag-1--found.webp')
  assert.equal(published.ContentType, 'image/webp')
  assert.deepEqual(published.Metadata, sourceMetadata)
  const metadata = await sharp(published.Body).metadata()
  assert.equal(metadata.pages, 2)
  assert.deepEqual(metadata.delay, [100, 200])
  assert.equal(metadata.loop, 0)
  assert.equal(objects.has(key), false)
})
