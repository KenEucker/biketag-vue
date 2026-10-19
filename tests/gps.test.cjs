const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Load the actual parser with the installed compiler; its only import is a type.
const filename = path.resolve(__dirname, '../functions/common/storage-metadata.ts')
const loaded = new Module(filename, module)
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
)
const { parseQueueObjectMetadata } = loaded.exports

const gps = { lat: 45.5231, long: -122.6765, alt: 12 }
const encode = (metadata) => Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64')

for (const [format, serialize] of [
  ['JSON', JSON.stringify],
  ['base64', encode],
]) {
  test(`preserves compact GPS and found fields from ${format} storage metadata`, () => {
    const metadata = {
      t: 99,
      p: 'test-player',
      fp: 'Finder',
      ft: 1720000000,
      fl: 'Park',
      g: gps,
    }
    const tag = parseQueueObjectMetadata(serialize(metadata))
    assert.deepEqual(tag.gps, gps)
    assert.equal(tag.tagnumber, 99)
    assert.equal(tag.playerId, 'test-player')
    assert.equal(tag.foundPlayer, 'Finder')
    assert.equal(tag.foundTime, 1720000000)
    assert.equal(tag.foundLocation, 'Park')
  })
}

test('supports the legacy gps field', () => {
  assert.deepEqual(parseQueueObjectMetadata(encode({ t: 99, gps })).gps, gps)
})

for (const coordinates of [
  { lat: 0, long: -122.6765, alt: 0 },
  { lat: 45.5231, long: 0, alt: -5 },
  { lat: 0, long: 0, alt: 0 },
]) {
  test(`prefers compact GPS over legacy GPS, including ${JSON.stringify(coordinates)}`, () => {
    const tag = parseQueueObjectMetadata(encode({ t: 99, g: coordinates, gps }))
    assert.deepEqual(tag.gps, coordinates)
  })
}

test('falls back to legacy GPS when the compact field is null', () => {
  assert.deepEqual(parseQueueObjectMetadata(encode({ t: 99, g: null, gps })).gps, gps)
})

test('keeps missing GPS absent', () => {
  assert.equal(parseQueueObjectMetadata(encode({ t: 99 })).gps, undefined)
})

test('ignores missing, malformed, and invalid tag metadata', () => {
  for (const data of [undefined, '', 'invalid', 'null', '{}', '{"t":"99"}', encode({ g: gps })]) {
    assert.equal(parseQueueObjectMetadata(data), undefined)
  }
})
