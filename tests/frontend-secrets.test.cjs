const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(file, dependencies = {}, source = fs.readFileSync(file, 'utf8')) {
  const filename = path.resolve(file)
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

const secrets = Object.fromEntries(
  [
    'A_M_CID',
    'A_M_CS',
    'I_TOKEN',
    'I_RTOKEN',
    'I_CSECRET',
    'IMGUR_REFRESH_TOKEN',
    'IMGUR_ACCESS_TOKEN',
    'IA_TOKEN',
    'IA_RTOKEN',
    'S_TOKEN',
    'SA_TOKEN',
    'S3_BE_ACCESS_ID',
    'S3_BE_ACCESS_KEY',
    'HOST_KEY',
    'G_PASS',
    'GOOGLE_ACCESS_TOKEN',
    'VITE_PRIVATE_TOKEN',
    'VUE_APP_PRIVATE_TOKEN',
    'RA_BE_KEY',
    'RF_KEY',
  ].map((key) => [key, `synthetic-private-${key}`]),
)

function environment(extra = {}) {
  const env = { ...secrets, ...extra }
  const { frontendEnvironment, publicEnvironmentKeys } = load('config/frontend-environment.ts', {
    vite: { loadEnv: () => env },
  })
  const plugin = frontendEnvironment()
  const config = plugin.config({}, { mode: 'production' })
  return { plugin, config, publicEnvironmentKeys }
}

test('frontend config exposes only explicit public variables and preserves FE credentials', () => {
  const publicEnv = {
    A_CID: 'public-spa-id',
    S3_FE_AID: 'public-storage-id',
    S3_FE_AKEY: 'restricted-frontend-key',
    RA_FE_KEY: 'public-rapid-key',
  }
  const { config, publicEnvironmentKeys } = environment(publicEnv)
  assert.deepEqual(config.envPrefix, [])
  for (const [key, value] of Object.entries(publicEnv))
    assert.equal(config.define[`process.env.${key}`], JSON.stringify(value))
  for (const key of Object.keys(secrets))
    assert.equal(config.define[`process.env.${key}`], undefined, key)
  const source = fs.readFileSync('src/common/constants.ts', 'utf8')
  for (const [, key] of source.matchAll(/process\.env\.([A-Z_0-9]+)/g)) {
    assert.ok(publicEnvironmentKeys.includes(key), `${key} is outside the public allowlist`)
  }
  for (const file of ['vite.config.mts']) {
    assert.match(fs.readFileSync(file, 'utf8'), /frontendEnvironment\(\)/)
  }
})

test('build guard catches backend credentials in chunks, escaped strings and source maps without printing values', () => {
  const { plugin } = environment({ A_M_CS: 'synthetic-private-"quoted"-secret' })
  for (const output of [
    { type: 'chunk', code: secrets.I_RTOKEN },
    { type: 'chunk', code: JSON.stringify('synthetic-private-"quoted"-secret') },
    { type: 'chunk', code: 'safe', map: { sourcesContent: [secrets.SA_TOKEN] } },
    { type: 'asset', source: Buffer.from(secrets.S3_BE_ACCESS_KEY) },
  ]) {
    assert.throws(
      () =>
        plugin.generateBundle.call(
          {
            error: (message) => {
              throw Error(message)
            },
          },
          {},
          { 'test.js': output },
        ),
      (error) =>
        error.message.includes('Server-only environment variable') &&
        !error.message.includes('synthetic-private'),
    )
  }
})

test('guard permits deliberately public FE values reused by the backend', () => {
  const { plugin } = environment({ RA_FE_KEY: secrets.RA_BE_KEY })
  plugin.generateBundle.call(
    { error: assert.fail },
    {},
    { 'test.js': { type: 'chunk', code: secrets.RA_BE_KEY } },
  )
})

test('browser SDK options carry public FE credentials without account tokens', () => {
  const source = fs.readFileSync('src/common/methods.ts', 'utf8')
  const start = source.indexOf('export const getBikeTagClientOpts')
  const end = source.indexOf('export const setRegionPolygonInCookie', start)
  const env = {
    ...secrets,
    GAME_NAME: 'demo',
    I_CID: 'public-imgur-id',
    RA_FE_KEY: 'fe-rapid',
    S3_FE_AID: 'fe-id',
    S3_FE_AKEY: 'fe-key',
  }
  const compiled = ts.transpileModule(source.slice(start, end).replace('export ', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  const options = new Function(
    'BikeTagEnv',
    'getDomainInfo',
    compiled + '\nreturn getBikeTagClientOpts()',
  )(env, () => ({ subdomain: 'demo' }))
  assert.deepEqual(options.aws, { accessKeyId: 'fe-id', secretAccessKey: 'fe-key' })
  assert.equal(options.imgur.rapidApiKey, 'fe-rapid')
  assert.equal(options.imgur.accessToken, undefined)
  assert.equal(options.imgur.refreshToken, undefined)
  for (const secret of Object.values(secrets)) assert.ok(!JSON.stringify(options).includes(secret))
})

test('a real Vite bundle and source maps retain public config and exclude backend and auto-prefixed secrets', async (t) => {
  const publicEnv = {
    A_CID: 'synthetic-public-spa-id',
    S3_FE_AID: 'synthetic-public-storage-id',
    S3_FE_AKEY: 'synthetic-public-storage-key',
    RA_FE_KEY: 'synthetic-public-rapid-key',
  }
  const original = Object.fromEntries(
    Object.keys({ ...secrets, ...publicEnv }).map((key) => [key, process.env[key]]),
  )
  Object.assign(process.env, secrets, publicEnv)
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
  const { build } = await import('vite')
  const { plugin } = environment(publicEnv)
  const constants = path.resolve('src/common/constants.ts').replaceAll('\\', '/')
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      plugin,
      {
        name: 'security-test-entry',
        resolveId(id) {
          if (id === 'virtual:security-test') return '\0security-test'
        },
        load(id) {
          if (id === '\0security-test')
            return `export { BikeTagEnv } from ${JSON.stringify(constants)}; export const env = import.meta.env;`
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      sourcemap: true,
      rollupOptions: { input: 'virtual:security-test' },
      lib: { entry: 'virtual:security-test', formats: ['es'], fileName: 'security-test' },
    },
  })
  const files = (Array.isArray(result) ? result : [result])
    .flatMap((bundle) => bundle.output)
    .map((output) =>
      output.type === 'chunk' ? output.code + JSON.stringify(output.map) : String(output.source),
    )
    .join('\n')
  for (const [key, value] of Object.entries(secrets)) assert.ok(!files.includes(value), key)
  for (const [key, value] of Object.entries(publicEnv)) assert.ok(files.includes(value), key)
})
