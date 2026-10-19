const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const sharp = require('sharp')

// Run the actual TypeScript modules using the repository's compiler, with SMTP isolated.
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

function mailer(t, deliver = async (message) => ({ accepted: [message.to], rejected: [] })) {
  const previous = { ...process.env }
  process.env.G_EMAIL = 'sender@example.org'
  process.env.G_PASS = 'synthetic-test-password'
  process.env.ADMIN_EMAIL = 'admin@example.org'
  t.after(() => {
    for (const name of ['G_EMAIL', 'G_PASS', 'ADMIN_EMAIL']) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  })
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
  const messages = []
  const email = loadTs('functions/common/email.ts', {
    nodemailer: {
      createTransport: () => ({
        sendMail: async (message) => {
          messages.push(message)
          return deliver(message)
        },
      }),
    },
  })
  return { ...email, messages }
}

const host = 'https://demo.biketag.org'
const storage = 'https://demo.nyc3.cdn.digitaloceanspaces.com'
function data() {
  return {
    host,
    gameHost: host,
    game: 'demo',
    logo: host + '/images/BikeTag.svg',
    ambassadorsUrl: host + '/queue',
    rejectionsUrl: host + '/rejections',
    tag: { tagnumber: 42, foundPlayer: 'Rider <b>& friends</b>' },
    foundImageUrl: storage + '/queue/demo--found.webp',
    mysteryImageUrl: storage + '/queue/demo--mystery.webp',
    currentMysteryImageUrl: storage + '/main/demo-tag-41--mystery.webp',
    newBikeTagPost: { tagnumber: 42, mysteryImageUrl: storage + '/main/demo-tag-42--mystery.webp' },
    mainParagraphText: 'Rider <b>& friends</b>',
    mainTitleText: 'Second submission',
    foundLocation: 'Park & Ride',
    foundTagBlurb: 'Rider <b>& friends</b>',
    comparisonText: 'Compare the photos',
    currentMysteryHint: 'Hint <b>& text</b>',
    currentMysteryBlurb: 'Current location',
    goToApproveButton: 'Review submission',
    goToQueueButton: 'Open queue',
    footerText: 'Open source',
    roundPublishedText: 'Round #42 is live in demo.',
    redditLink: '',
    blueskyLink: '',
    instagramLink: '',
    imageType: 'found',
    roundNumber: 41,
    playerId: 'rider',
    playerIP: '192.0.2.1',
    playerIp: '192.0.2.1',
    imageUrl: storage + '/queue/demo--rejected.webp',
    reason: 'Example <reason> & detail',
    payload: '{"message":"Example <reason> & detail"}',
    gameProper: 'Demo',
    settingName: 'Timer',
    settingKey: 'queue::autoPost',
    currentValue: '<example>',
    requestedValue: '20',
    ambassadorName: 'Rider',
    ambassadorEmail: 'rider@example.org',
  }
}

test('admin email fixtures render every supported template without SMTP configuration', (t) => {
  const email = mailer(t)
  delete process.env.G_EMAIL
  delete process.env.G_PASS
  const { emailTestTemplates, getEmailTestData } = loadTs('functions/common/email-testing.ts')
  const available = fs
    .readdirSync('functions/emails')
    .filter((name) => name.endsWith('--text.liquid'))
  assert.deepEqual(
    emailTestTemplates.map(({ name }) => name).sort(),
    available.map((name) => name.replace('--text.liquid', '')).sort(),
  )
  for (const { name } of emailTestTemplates) {
    const rendered = email.renderEmail(name, getEmailTestData('demo', host))
    assert.ok(rendered.html.trim())
    assert.ok(rendered.text.trim())
    assert.doesNotMatch(rendered.html, /src=""|\{\{/)
    for (const match of rendered.html.matchAll(/src="https:\/\/demo\.biketag\.org([^"?]*)/g)) {
      assert.ok(fs.existsSync(path.join('public', match[1])), `Missing sample asset: ${match[1]}`)
    }
  }
  assert.equal(email.messages.length, 0)
})

function emailTestHandler(
  t,
  {
    admin = true,
    deliver,
    currentTag,
    queuedTags = [],
    currentError,
    queueError,
    gameError,
    source = 'aws',
    gameLogo = 'https://cdn.sanity.io/images/example/demo-game.png',
    resolvedGameLogo = gameLogo,
  } = {},
) {
  const email = mailer(t, deliver)
  const calls = []
  const { default: handler } = loadTs('functions/email-test.mts', {
    biketag: {
      BikeTagClient: class {
        async game() {
          calls.push(['game'])
          if (gameError) throw gameError
          return {
            name: 'demo',
            awsRegion: 'nyc3',
            mainhash: 'main-album',
            queuehash: 'queue-album',
            logo: gameLogo,
          }
        }
        config(options) {
          calls.push(['config', options])
        }
        async getTag(payload, options) {
          calls.push(['current', payload, options])
          if (currentError) throw currentError
          return { success: true, data: currentTag }
        }
        async getQueue(payload, options) {
          calls.push(['queue', payload, options])
          if (queueError) throw queueError
          return { success: true, data: queuedTags }
        }
      },
    },
    './common': {
      acceptCorsHeaders: () => ({}),
      getProfileAuthorization: async () => (admin ? { email: 'admin@example.org' } : null),
      requireGlobalAdmin: (profile) => profile?.email === 'admin@example.org',
      getBikeTagClientOpts: (req, authorized, admin, game) => ({
        game: 'demo',
        aws: { region: game?.awsRegion },
        imgur: { hash: game?.mainhash, queuehash: game?.queuehash },
      }),
      getGameSiteUrl: () => host,
      getImageSource: () => source,
      getSanityImageUrl: (value, size) => {
        calls.push(['logo', value, size])
        return resolvedGameLogo
      },
    },
    './common/email': email,
  })
  const request = (body, method = 'POST') =>
    handler(
      new Request(host + '/api/email-test', {
        method,
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      }),
    )
  return { email, handler, request, calls }
}

const liveRound = {
  tagnumber: 103,
  mysteryImageUrl: storage + '/main/demo-tag-103--mystery.webp',
  mysteryPlayer: 'Current Rider',
  hint: 'Beside the real fountain',
}
const liveSubmission = {
  tagnumber: 104,
  foundImageUrl: storage + '/queue/demo-tag-103--found--rider.webp',
  mysteryImageUrl: storage + '/queue/demo-tag-104--mystery--rider.webp',
  foundPlayer: 'Queue Rider <&>',
  foundLocation: 'Actual park entrance',
  playerId: 'queue-rider',
}

test('every test email uses the game logo in a compact header and the main logo in its footer', async (t) => {
  const { emailTestTemplates } = loadTs('functions/common/email-testing.ts')
  const { email, request, calls } = emailTestHandler(t)
  const logo = 'https://cdn.sanity.io/images/example/demo-game.png'
  for (const { name: template } of emailTestTemplates) {
    const preview = await (await request({ action: 'preview', template })).json()
    const images = [...preview.html.matchAll(/<img\b[^>]*>/gi)].map(([image]) => image)
    assert.ok(images[0].includes(`src="${logo}"`), template)
    assert.match(images[0], /width="96"/)
    assert.match(images[0], /max-height:96px/)
    assert.match(
      preview.html,
      /class="email-header"[^>]*background="https:\/\/demo\.biketag\.org\/images\/email-illustrated-header.png"/,
    )
    assert.match(
      preview.html,
      /background-image:url\('https:\/\/demo\.biketag\.org\/images\/email-illustrated-header.png'\)/,
    )
    assert.ok(preview.html.includes('/images/email-illustrated-footer.png'), template)
    assert.doesNotMatch(preview.html, /<img[^>]*src="[^"]*email-illustrated-header.png"/)
    const footer = images.find((image) => image.includes('/images/email-logo.png'))
    assert.ok(footer, template)
    assert.match(footer, /width="40"/)
    assert.ok(preview.html.indexOf(images[0]) < preview.html.indexOf(footer), template)

    assert.equal(
      (await request({ action: 'send', template, recipient: 'one@example.org' })).status,
      200,
    )
    assert.ok(email.messages.at(-1).html.includes(`src="${logo}"`), template)
  }
  assert.equal(calls.filter(([name]) => name === 'game').length, emailTestTemplates.length * 2)
  assert.ok(calls.filter(([name]) => name === 'logo').every(([, , size]) => size === 's'))
})

test('error emails use the illustrated layout and preserve escaped diagnostic details', (t) => {
  const email = mailer(t)
  for (const template of ['post-tag-error', 'approve-tag-error']) {
    const { html, text } = email.renderEmail(template, {
      host,
      game: 'demo',
      logo: host + '/images/BikeTag.svg',
      playerIp: '192.0.2.7',
      payload: '<script>alert("example")</script>',
    })
    assert.match(html, /class="email-shell"/)
    assert.match(html, /class="email-header"/)
    assert.match(html, /email-illustrated-footer.png/)
    assert.match(html, /192\.0\.2\.7/)
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>|href=""|src=""/)
    assert.ok(html.includes(host + '/dashboard'))
    assert.match(text, /192\.0\.2\.7/)
    assert.match(text, /<script>/)
  }
})

test('test emails resolve relative and Sanity game logos even when tag data is unavailable', async (t) => {
  for (const [gameLogo, resolvedGameLogo, expected] of [
    ['/images/BikeTag.svg', '/images/BikeTag.svg', host + '/images/BikeTag.svg'],
    [
      'image-demo-200x200-png',
      'https://cdn.sanity.io/images/example/demo-200x200.png?h=192',
      'https://cdn.sanity.io/images/example/demo-200x200.png?h=192',
    ],
  ]) {
    const { request, calls } = emailTestHandler(t, {
      gameLogo,
      resolvedGameLogo,
      currentError: new Error('Current round unavailable'),
      queueError: new Error('Queue unavailable'),
    })
    const preview = await (
      await request({ action: 'preview', template: 'post-new-biketag' })
    ).json()
    assert.ok(preview.html.includes(`src="${expected}"`))
    assert.match(preview.dataSource, /Sample submission/)
    assert.deepEqual(
      calls.find(([name]) => name === 'logo'),
      ['logo', gameLogo, 's'],
    )
  }
})

test('submission and approval tests preview and send live queue photos and metadata', async (t) => {
  await imageFetch(t)
  const partial = { ...liveSubmission, mysteryImageUrl: '', foundLocation: 'Partial submission' }
  const { email, request, calls } = emailTestHandler(t, {
    currentTag: liveRound,
    queuedTags: [partial, liveSubmission],
  })
  for (const template of ['post-new-biketag', 'approve-new-biketag']) {
    const preview = await request({ action: 'preview', template })
    assert.equal(preview.status, 200)
    const result = await preview.json()
    assert.match(result.dataSource, /Queued submission for round #104/)
    assert.ok(result.html.includes(liveSubmission.foundImageUrl))
    assert.ok(result.html.includes(liveSubmission.mysteryImageUrl))
    assert.match(result.html, /Actual park entrance/)
    assert.match(result.html, /Queue Rider &lt;&amp;&gt;/)
    assert.match(result.html, /Beside the real fountain/)
    assert.match(result.text, /Round #104/)
    assert.doesNotMatch(result.html, /biketag-example-1|Sample park|Partial submission/)

    const sent = await request({ action: 'send', template, recipient: 'one@example.org' })
    assert.equal(sent.status, 200)
    const message = email.messages.at(-1)
    assert.equal(message.to, 'one@example.org')
    assert.equal(message.attachments.length, 2)
    assert.match(message.html, /src="cid:/)
    assert.match(message.text, /Round #104/)
  }
  assert.ok(calls.some(([name, options]) => name === 'config' && options.aws.region === 'nyc3'))
  for (const [name, payload, options] of calls.filter(([name]) => name === 'queue')) {
    assert.deepEqual(payload, { resize: false, reindex: false })
    assert.equal(options.source, 'aws')
  }
})

test('published round tests use the current round, not the queue', async (t) => {
  const { email, request, calls } = emailTestHandler(t, {
    currentTag: liveRound,
    queuedTags: [liveSubmission],
  })
  const template = 'biketag-auto-posted'
  const preview = await (await request({ action: 'preview', template })).json()
  assert.match(preview.dataSource, /Current round #103/)
  assert.match(preview.text, /round #103 is live/)
  assert.ok(preview.html.includes(liveRound.mysteryImageUrl))
  assert.doesNotMatch(preview.html + preview.text, /#42|#104|biketag-example-1/)
  assert.equal(
    (await request({ action: 'send', template, recipient: 'one@example.org' })).status,
    200,
  )
  assert.match(email.messages[0].text, /round #103 is live/)
  assert.ok(email.messages[0].html.includes(liveRound.mysteryImageUrl))
  assert.equal(calls.filter(([name]) => name === 'queue').length, 0)
})

test('partial queued submissions omit missing photos and tolerate current-round lookup failure', async (t) => {
  const { request, calls } = emailTestHandler(t, {
    queuedTags: [{ ...liveSubmission, mysteryImageUrl: '' }],
    currentError: new Error('Current round unavailable'),
    source: 'imgur',
  })
  const response = await request({ action: 'preview', template: 'approve-new-biketag' })
  assert.equal(response.status, 200)
  const preview = await response.json()
  assert.ok(preview.html.includes(liveSubmission.foundImageUrl))
  assert.match(preview.html, /Photo unavailable/)
  assert.doesNotMatch(preview.html, /Current mystery|biketag-example-1|src=""/)
  assert.match(preview.dataSource, /Queued submission/)
  assert.equal(calls.find(([name]) => name === 'queue')[2].source, 'imgur')
})

test('empty queues and failed live reads fall back to labelled sample content', async (t) => {
  for (const options of [
    {},
    { queuedTags: [{ tagnumber: 104 }] },
    { queueError: new Error('Queue unavailable') },
    { gameError: new Error('Game unavailable') },
  ]) {
    const { request } = emailTestHandler(t, options)
    const response = await request({ action: 'preview', template: 'post-new-biketag' })
    assert.equal(response.status, 200)
    const preview = await response.json()
    assert.match(preview.dataSource, /Sample submission/)
    assert.match(preview.html, /biketag-example-1/)
    assert.match(preview.text, /Round #42/)
  }
  const { request } = emailTestHandler(t, { currentError: new Error('No current round') })
  const preview = await (
    await request({ action: 'preview', template: 'biketag-auto-posted' })
  ).json()
  assert.match(preview.dataSource, /Sample round/)
})

test('email testing requires global admin access for listing, previews and sending', async (t) => {
  const { email, request, calls } = emailTestHandler(t, { admin: false })
  for (const [body, method] of [
    [undefined, 'GET'],
    [{ action: 'preview', template: 'post-new-biketag' }, 'POST'],
    [{ action: 'send', template: 'post-new-biketag', recipient: 'one@example.org' }, 'POST'],
  ]) {
    assert.equal((await request(body, method)).status, 403)
  }
  assert.equal(email.messages.length, 0)
  assert.equal(calls.length, 0)
})

test('email testing previews without SMTP and validates requests before delivery', async (t) => {
  const { email, handler, request } = emailTestHandler(t)
  delete process.env.G_PASS
  const listing = await request(undefined, 'GET')
  assert.equal(listing.headers.get('cache-control'), 'no-store')
  assert.equal((await listing.json()).configured, false)
  const preview = await request({ action: 'preview', template: 'post-new-biketag' })
  assert.equal(preview.status, 200)
  assert.match((await preview.json()).subject, /^\[TEST\]/)
  for (const body of [
    null,
    { action: 'preview', template: '../test' },
    { action: 'unknown', template: 'post-new-biketag' },
    { action: 'send', template: 'post-new-biketag', recipient: 'one@example.org,two@example.org' },
    {
      action: 'send',
      template: 'post-new-biketag',
      recipient: 'one@example.org\r\nBcc:x@example.org',
    },
  ]) {
    assert.equal((await request(body)).status, 400)
  }
  assert.equal((await handler(new Request(host, { method: 'POST', body: '{' }))).status, 400)
  assert.equal((await request(undefined, 'DELETE')).status, 405)
  assert.equal((await request(undefined, 'OPTIONS')).status, 204)
  assert.equal(
    (
      await request({
        action: 'send',
        template: 'post-new-biketag',
        recipient: 'one@example.org',
      })
    ).status,
    503,
  )
  assert.equal(email.messages.length, 0)
})

test('email testing sends one marked message only to the chosen recipient', async (t) => {
  const { email, request } = emailTestHandler(t)
  const response = await request({
    action: 'send',
    template: 'post-new-biketag',
    recipient: ' one@example.org ',
  })
  assert.equal(response.status, 200)
  assert.equal(email.messages.length, 1)
  assert.equal(email.messages[0].to, 'one@example.org')
  assert.match(email.messages[0].subject, /^\[TEST\]/)
  assert.match(email.messages[0].html, /No game action was performed/)
})

test('email testing reports SMTP rejection and failure', async (t) => {
  for (const deliver of [
    async () => ({ accepted: [], rejected: ['one@example.org'] }),
    async () => {
      throw new Error('SMTP unavailable')
    },
  ]) {
    const { request } = emailTestHandler(t, { deliver })
    const response = await request({
      action: 'send',
      template: 'post-tag-error',
      recipient: 'one@example.org',
    })
    assert.ok([502, 500].includes(response.status))
    assert.ok((await response.json()).error)
  }
})
async function imageFetch(t, missing = () => false) {
  const image = await sharp({
    create: { width: 32, height: 24, channels: 3, background: '#209dd6' },
  })
    .png()
    .toBuffer()
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url)
    if (missing()) return new Response(null, { status: 404 })
    return new Response(image, { headers: { 'content-type': 'image/png' } })
  })
  return calls
}

test('photo sizes follow each provider and preserve queue originals, unknown hosts and queries', (t) => {
  const { getEmailImageUrl: sized } = mailer(t)
  assert.equal(sized('https://i.imgur.com/abc1234.jpg', 'm'), 'https://i.imgur.com/abc1234m.jpg')
  assert.equal(
    sized('https://i.imgur.com/abc1234l.jpg?x=1', 'm'),
    'https://i.imgur.com/abc1234m.jpg?x=1',
  )
  assert.equal(sized(storage + '/queue/demo.webp', 'm'), storage + '/queue/demo.webp')
  assert.equal(sized(storage + '/main/demo.webp', 'm'), storage + '/main/demo_medium.webp')
  assert.equal(sized(storage + '/main/demo_medium.webp', 's'), storage + '/main/demo_small.webp')
  assert.equal(sized(storage + '/main/demo.webp', 'l'), storage + '/main/demo.webp')
  assert.equal(
    sized('https://bucket.s3.amazonaws.com/main/demo.webp', 'm'),
    'https://bucket.s3.amazonaws.com/main/demo_medium.webp',
  )
  assert.equal(
    sized('https://cdn.sanity.io/images/example.jpg?width=100', 'l'),
    'https://cdn.sanity.io/images/example.jpg?width=100',
  )
  assert.equal(sized('cid:photo@biketag', 'm'), 'cid:photo@biketag')
  const signed = storage + '/main/demo.webp?X-Amz-Signature=example'
  assert.equal(sized(signed, 'm'), signed)
})

test('global and per-template disable settings apply consistently, including the legacy publication name', (t) => {
  const { isGameEmailEnabled: enabled } = mailer(t)
  assert.equal(enabled({ settings: {} }, 'post-new-biketag'), true)
  for (const sendall of [undefined, 'true', 'false']) {
    assert.equal(
      enabled(
        { settings: { 'emails::sendall': sendall, 'emails::disable': ' post-new-biketag ' } },
        'post-new-biketag',
      ),
      false,
    )
  }
  assert.equal(enabled({ settings: { 'emails::sendall': 'false' } }, 'post-tag-error'), false)
  assert.equal(
    enabled(
      { settings: { 'emails::disable': ' NEW-BIKETAG-NOTIFICATION ' } },
      'biketag-auto-posted',
      ['new-biketag-notification'],
    ),
    false,
  )
  assert.equal(
    enabled({ settings: { 'emails::disable': '*' } }, 'post-biketag-screening-rejection'),
    false,
  )
})

test('queue position identifies the submission rather than matching display names', (t) => {
  const { getSubmissionQueuePosition: position } = mailer(t)
  const queue = [
    { tagnumber: 42, playerId: 'one', mysteryImageUrl: 'one', foundPlayer: 'same' },
    { tagnumber: 42, playerId: 'two', mysteryImageUrl: 'two', foundPlayer: 'same' },
  ]
  assert.equal(position(queue, { tagnumber: 42, playerId: 'two' }), 2)
  assert.equal(position(queue, { tagnumber: 42, mysteryImageUrl: 'two' }), 2)
  assert.equal(position(queue, { tagnumber: 43, playerId: 'two' }), undefined)
  assert.equal(position(queue, { tagnumber: 42, playerId: 'missing' }), undefined)
})

test('submission embeds photographs once per batch, including after queue cleanup between recipients', async (t) => {
  let queueDeleted = false
  const email = mailer(t, async (message) => {
    queueDeleted = true
    return { accepted: [message.to], rejected: [] }
  })
  const calls = await imageFetch(t, () => queueDeleted)
  const recipients = [
    { id: 'one', email: 'one@example.org' },
    { id: 'two', email: 'two@example.org' },
  ]
  const result = await email.sendEmailsToAmbassadors(
    'post-new-biketag',
    'Example',
    recipients,
    data,
  )
  assert.equal(result.accepted.length, 2)
  assert.equal(calls.length, 2)
  for (const message of email.messages) {
    assert.equal(message.attachments.length, 2)
    assert.match(message.html, /src="cid:/)
    assert.doesNotMatch(message.html, /src="https:[^"]*\/queue\//)
    assert.doesNotMatch(message.text, /\/queue\/demo--/)
    assert.doesNotMatch(message.html + message.text, /expiry=|btaId=/)
    assert.match(message.html, /Rider &lt;b&gt;&amp; friends&lt;\/b&gt;/)
    assert.match(message.text, /Rider <b>& friends<\/b>/)
    assert.match(message.html, /Park &amp; Ride/)
    assert.equal((await sharp(message.attachments[0].content).metadata()).format, 'jpeg')
  }
  assert.deepEqual(email.messages[0].attachments, email.messages[1].attachments)
})

test('missing optional photos omit empty sources and the current mystery section', async (t) => {
  const email = mailer(t)
  await email.sendEmail(
    'one@example.org',
    'Example',
    {
      ...data(),
      foundImageUrl: '',
      mysteryImageUrl: '',
      currentMysteryImageUrl: '',
    },
    'post-new-biketag',
  )
  assert.doesNotMatch(email.messages[0].html, /src=""|<h2[^>]*>Current mystery/)
  assert.match(email.messages[0].html, /Photo unavailable/)
})

test('missing or oversized stored photos have an honest fallback without blocking delivery', async (t) => {
  const email = mailer(t)
  t.mock.method(globalThis, 'fetch', async (url) =>
    url.includes('found')
      ? new Response(null, { status: 404 })
      : new Response('x', { headers: { 'content-length': String(13 * 1024 * 1024) } }),
  )
  await email.sendEmail('one@example.org', 'Example', data(), 'post-new-biketag')
  assert.equal(email.messages[0].attachments.length, 0)
  assert.match(email.messages[0].html, /Photo unavailable/)
  assert.doesNotMatch(email.messages[0].html, /src="https:[^"]*\/queue\//)
})

test('snapshot fetching excludes arbitrary hosts and insecure URLs', async (t) => {
  const email = mailer(t)
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Unexpected fetch')
  })
  const html =
    '<img src="https://example.org/queue/photo.jpg"><img src="http://demo.nyc3.cdn.digitaloceanspaces.com/queue/photo.jpg">'
  assert.deepEqual(await email.embedEmailQueueImages(html), { html, attachments: [] })
})

test('SMTP failure does not skip later ambassadors or the administrator; duplicate recipients send once', async (t) => {
  const email = mailer(t, async (message) => {
    if (message.to === 'one@example.org') throw new Error('Simulated SMTP failure')
    return { accepted: [message.to], rejected: [] }
  })
  const result = await email.sendEmailsToAmbassadors(
    'post-tag-error',
    'Example',
    [{ email: 'one@example.org' }, { email: 'two@example.org' }, { email: ' TWO@example.org ' }],
    data,
    true,
  )
  assert.deepEqual(result, {
    accepted: ['two@example.org', 'admin@example.org'],
    rejected: ['one@example.org'],
  })
  assert.equal(email.messages.length, 3)
})

test('template failures and empty SMTP results are reported as rejections', async (t) => {
  const email = mailer(t, async () => ({ accepted: [], rejected: [] }))
  assert.deepEqual(
    await email.sendEmailsToAmbassadors(
      'missing-template',
      'Example',
      [{ email: 'one@example.org' }],
      data,
    ),
    { accepted: [], rejected: ['one@example.org'] },
  )
  assert.equal(email.messages.length, 0)
  assert.deepEqual(
    await email.sendEmailsToAmbassadors(
      'post-tag-error',
      'Example',
      [{ email: 'one@example.org' }],
      data,
    ),
    { accepted: [], rejected: ['one@example.org'] },
  )
  assert.deepEqual(await email.sendEmailsToAmbassadors('post-tag-error', 'Example', [], data), {
    accepted: [],
    rejected: ['No email recipients configured'],
  })
  await assert.rejects(
    email.sendEmail('one@example.org', 'Example', data(), '../test'),
    /Invalid email template/,
  )
})

test('all seven template pairs render safely with their updated graphics and data', async (t) => {
  const email = mailer(t)
  await imageFetch(t)
  const families = fs
    .readdirSync('functions/emails')
    .filter((name) => name.endsWith('--text.liquid'))
    .map((name) => name.replace('--text.liquid', ''))
  assert.equal(families.length, 7)
  for (const name of families) {
    await email.sendEmail('one@example.org', 'Example', data(), name, 'reply@example.org')
    const message = email.messages.at(-1)
    assert.ok(message.html.length && message.text.length, name)
    assert.equal(message.replyTo, 'reply@example.org')
    assert.doesNotMatch(message.html, /Example <reason>|Rider <b>|src=""|bluesky2x|expiry=/, name)
    for (const match of message.html.matchAll(
      /src="https:\/\/demo\.biketag\.org(\/images\/[^"?]+)"/g,
    )) {
      assert.ok(fs.existsSync('public' + match[1]), match[1])
    }
  }
  const published = email.messages[families.indexOf('biketag-auto-posted')]
  assert.match(published.html, /ROUND PUBLISHED/)
  assert.match(published.text, /round #42 is live in demo/)
  assert.doesNotMatch(
    published.html + published.text,
    /auto-approved|auto-posted|AUTOMATICALLY PUBLISHED/,
  )
  const settings = email.messages[families.indexOf('game-setting-change-request')]
  assert.match(settings.html, /&lt;example&gt;/)
  assert.match(settings.text, /<example>/)
})

function notifyHandler(t, tags, notifications) {
  class Client {
    config() {}
    async game() {
      return { name: 'demo', slug: 'demo', awsRegion: 'nyc3' }
    }
    async getTags() {
      return { success: true, data: tags }
    }
  }
  let seenPrevious
  const { autoNotifyNewBikeTagPosted } = loadTs('functions/autopost-notify.mts', {
    biketag: Client,
    './common': {
      getBikeTagClientOpts: () => ({ game: 'demo', aws: {} }),
      getImageSource: () => 'aws',
      getPayloadOpts: async () => ({}),
      isRequestAllowed: () => true,
      log: () => {},
      sendNewBikeTagNotifications: async (_game, previous) => {
        seenPrevious = previous
        return notifications
      },
    },
  })
  return { handler: autoNotifyNewBikeTagPosted, previous: () => seenPrevious }
}

test('launch notification accepts a single first tag and preserves rejected notification errors', async (t) => {
  const tag = { tagnumber: 1, mysteryTime: Date.now() / 1000 }
  const launch = notifyHandler(t, [tag], [Promise.resolve(['one@example.org'])])
  assert.equal((await launch.handler(new Request(host))).errors, false)
  assert.equal(launch.previous(), undefined)
  const failed = notifyHandler(t, [tag], [Promise.reject(new Error('Delivery failed'))])
  const result = await failed.handler(new Request(host))
  assert.equal(result.errors, true)
  assert.deepEqual(result.results, [{ error: 'Delivery failed' }])
  const missing = notifyHandler(t, [{ ...tag, tagnumber: 5 }], [])
  assert.equal((await missing.handler(new Request(host))).errors, true)
})

test('submission handler supplies the real location, an identity-based position and a stable authenticated queue link', async (t) => {
  const email = mailer(t)
  const tag = {
    tagnumber: 42,
    playerId: 'two',
    foundPlayer: 'Same name',
    foundLocation: 'Library',
    mysteryImageUrl: storage + '/queue/new.webp',
    foundImageUrl: storage + '/queue/found.webp',
  }
  const game = { name: 'demo', ambassadors: ['ambassador'], settings: {} }
  let captured
  class Client {
    config() {}
    async game() {
      return game
    }
    async ambassadors() {
      return [{ name: 'ambassador', id: 'ambassador', email: 'one@example.org' }]
    }
    async getTag() {
      return { success: false }
    }
    async getQueue() {
      return { success: true, data: [{ ...tag, playerId: 'one' }, tag] }
    }
  }
  const handler = loadTs('functions/submission-created.mts', {
    biketag: { BikeTagClient: Client },
    '../src/common/gps': { summarizeTagGps: () => ({}) },
    '../src/common/format': { ordinalSuffixOf: (number) => (number === 2 ? '2nd' : `${number}th`) },
    './common': {
      defaultLogo: '/images/BikeTag.svg',
      getBikeTagClientOpts: () => ({}),
      getGameSiteUrl: () => host,
      getGameSocialLinks: () => ({}),
      getImageSource: () => 'aws',
      getSanityImageUrl: (url) => url,
      getSubmissionQueuePosition: email.getSubmissionQueuePosition,
      isGameEmailEnabled: email.isGameEmailEnabled,
      log: () => {},
      sendEmailsToAmbassadors: async (_name, _subject, ambassadors, builder) => {
        captured = builder(ambassadors[0])
        return { accepted: ['one@example.org'], rejected: [] }
      },
    },
  }).default
  const response = await handler(
    new Request(host, {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          form_name: 'post-new-biketag',
          data: { game: 'demo', tag: JSON.stringify(tag) },
        },
      }),
    }),
  )
  assert.equal(response.data, true)
  assert.equal(captured.foundLocation, 'Library')
  assert.match(captured.mainTitleText, /2nd submission/)
  assert.equal(captured.ambassadorsUrl, host + '/queue')
  assert.equal(captured.currentMysteryImageUrl, '')
  assert.equal(captured.expiryHash, undefined)
})

test('inline snapshots produce a self-contained MIME message without SMTP', async (t) => {
  const nodemailer = require('nodemailer')
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  })
  let mime
  const email = mailer(t, async (message) => {
    const result = await transport.sendMail(message)
    mime = result.message.toString()
    return { accepted: [message.to], rejected: [] }
  })
  await imageFetch(t)
  await email.sendEmail('one@example.org', 'Example', data(), 'post-new-biketag')
  assert.match(mime, /multipart\/related/)
  assert.match(mime, /Content-ID: <[a-f0-9]+@biketag>/)
  assert.match(mime, /Content-Type: image\/jpeg/)
  assert.match(mime, /Content-Disposition: inline/)
})
