const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(relativePath) {
  const filename = path.resolve(relativePath)
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  )
  return loaded.exports
}
const { resolveApiUrl, getRawApiPath, fetchApiResponse } = load('src/common/api.ts')
const origin = 'https://portland.biketag.org'

test('API URLs preserve query values and raw links bypass the app shell', () => {
  for (const pathname of ['/api/tags?game=portland&name=A%26B&tag=1&tag=2', '/api', '/api/']) {
    const url = resolveApiUrl(pathname, origin)
    assert.equal(`${url.pathname}${url.search}`, pathname)
    assert.equal(
      getRawApiPath(url),
      pathname.startsWith('/api/tags')
        ? '/.netlify/functions/tags?game=portland&name=A%26B&tag=1&tag=2'
        : '/.netlify/functions/api',
    )
  }
  assert.equal(resolveApiUrl(`${origin}/api/stats`, origin).pathname, '/api/stats')
})

test('request input rejects other origins, non-API paths, credentials, and fragments', () => {
  for (const input of [
    'https://example.com/api/tags',
    '//example.com/api/tags',
    '/play',
    '/api/tags/extra',
    '/api/tags#fragment',
    'https://user:pass@portland.biketag.org/api/tags',
  ]) {
    assert.throws(() => resolveApiUrl(input, origin))
  }
})

test('JSON responses include primitives, null, empty containers, and HTTP error bodies', async (t) => {
  const signal = new AbortController().signal
  for (const data of [
    null,
    false,
    0,
    '',
    [],
    {},
    { nested: [{ error: '<script>alert(1)</script>' }] },
  ]) {
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, '/api/tags?game=portland')
      assert.equal(options.headers.Accept, 'application/json')
      assert.equal(options.signal, signal)
      return new Response(JSON.stringify(data), { status: 403 })
    })
    const result = await fetchApiResponse('/api/tags?game=portland', signal)
    assert.equal(result.isJson, true)
    assert.equal(result.status, 403)
    assert.equal(result.ok, false)
    assert.deepEqual(result.data, data)
  }
})

test('non-JSON, empty, and binary responses are handled without JSON parsing errors', async (t) => {
  const signal = new AbortController().signal
  for (const text of ['<html>Not found</html>', '']) {
    t.mock.method(globalThis, 'fetch', async () => new Response(text, { status: 404 }))
    const result = await fetchApiResponse('/api/missing', signal)
    assert.equal(result.isJson, false)
    assert.equal(result.text, text)
  }
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('binary', {
        headers: { 'Content-Type': 'image/webp' },
      }),
  )
  const result = await fetchApiResponse('/api/current', signal)
  assert.equal(result.isJson, false)
  assert.equal(result.contentType, 'image/webp')
  assert.equal(result.text, '')
})
