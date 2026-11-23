const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const filename = path.resolve('functions/submission-created.mts')

function createHandler({ game, ambassadors = [{ name: 'Ambassador' }], accepted = ['ambassador@example.org'] } = {}) {
  const calls = []
  const testGame = game === undefined
    ? { name: 'demo', logo: '/logo.svg', settings: {}, ambassadors: ['Ambassador'] }
    : game
  const mocks = {
    biketag: {
      BikeTagClient: class {
        async game() {
          calls.push('game')
          return testGame
        }
        async ambassadors() {
          calls.push('ambassadors')
          return ambassadors
        }
        async getTag() {
          calls.push('getTag')
          return { success: true, data: { tagnumber: 1, mysteryImageUrl: '/current.webp' } }
        }
        async getQueue() {
          calls.push('getQueue')
          return { success: true, data: [] }
        }
        config() {
          calls.push('config')
        }
      },
    },
    '../src/common/format': { ordinalSuffixOf: () => '1st' },
    '../src/common/gps': { summarizeTagGps: () => ({}) },
    './common/email': { getSubmissionErrorEmailData: () => ({ eventLabel: 'Post error' }) },
    './common': {
      defaultLogo: '/logo.svg',
      getBikeTagClientOpts: () => ({}),
      getGameSiteUrl: () => 'https://demo.biketag.org',
      getGameSocialLinks: () => ({}),
      getImageSource: () => 'imgur',
      getSanityImageUrl: (url) => url,
      getSubmissionQueuePosition: () => undefined,
      isGameEmailEnabled: () => true,
      log: () => {},
      sendEmailsToAmbassadors: async () => {
        calls.push('sendEmail')
        return { accepted, rejected: [] }
      },
    },
    './common/constants': { HttpStatusCode: { Ok: 200, BadRequest: 400 } },
  }
  const loaded = new Module(filename, module)
  loaded.filename = filename
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded.require = (name) => {
    assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`)
    return mocks[name]
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
  const handler = loaded.exports.default
  const submit = (formName, data = {}) =>
    handler(
      new Request('https://www.biketag.org/.netlify/functions/submission-created', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          payload: {
            form_name: formName,
            data: {
              game: 'demo',
              tag: JSON.stringify({ game: 'demo', tagnumber: 2, foundPlayer: 'Rider' }),
              ...data,
            },
          },
        }),
      }),
    )
  return { calls, submit }
}

test('found and mystery image forms acknowledge without looking up a game or sending mail', async () => {
  const { calls, submit } = createHandler({ game: null })
  for (const formName of ['add-found-tag', 'add-mystery-tag']) {
    const response = await submit(formName)
    assert.ok(response instanceof Response)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { data: true })
  }
  assert.deepEqual(calls, [])
})

test('missing games return valid bad-request Responses instead of legacy objects', async (t) => {
  t.mock.method(console, 'error', () => {})
  const { calls, submit } = createHandler({ game: null })
  const response = await submit('post-new-biketag')
  assert.ok(response instanceof Response)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { data: false })
  assert.deepEqual(calls, ['game'])
})

test('new-post notifications still load game data and report successful mail delivery', async () => {
  const { calls, submit } = createHandler()
  const response = await submit('post-new-biketag')
  assert.ok(response instanceof Response)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { data: true })
  assert.deepEqual(calls, ['game', 'ambassadors', 'getTag', 'getQueue', 'sendEmail'])
})

test('error reports still notify ambassadors without depending on the queue', async () => {
  const { calls, submit } = createHandler()
  const response = await submit('post-tag-error')
  assert.ok(response instanceof Response)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { data: true })
  assert.deepEqual(calls, ['game', 'ambassadors', 'sendEmail'])
})

test('missing ambassadors return a valid bad-request Response', async () => {
  const { submit } = createHandler({ ambassadors: [] })
  const response = await submit('post-new-biketag')
  assert.ok(response instanceof Response)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { data: false })
})
