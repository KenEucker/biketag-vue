const assert = require('node:assert/strict')
const { test } = require('node:test')
const BikeTagClient = require('biketag').default ?? require('biketag').BikeTagClient

const awsGame = {
  name: 'portland',
  awsRegion: 'sfo3',
  settings: { 'data::aws': 'true' },
}

const imgurGame = {
  name: 'portland',
  mainhash: 'main-album',
  queuehash: 'queue-album',
  settings: { 'data::aws': 'false', 'data::imgur': 'true' },
}

test('API 3.6 selects game providers with all production adapter credentials configured', () => {
  const client = new BikeTagClient({
    game: 'portland',
    sanity: { projectId: 'project', dataset: 'production' },
    imgur: { clientId: 'imgur-client', rapidApiKey: 'rapid-api-key' },
    aws: { region: 'sfo3', accessKeyId: 'aws-access', secretAccessKey: 'aws-secret' },
  })

  client.setGameContext(awsGame)
  assert.equal(client.options({}, undefined, {}, 'getTags').source, 'aws')
  assert.equal(client.options({}, undefined, {}, 'uploadTagImage').source, 'aws')
  assert.equal(client.options({}, undefined, {}, 'getGame').source, 'sanity')

  client.setGameContext(imgurGame)
  assert.equal(client.options({}, undefined, {}, 'getTags').source, 'imgur')
  assert.equal(client.options({}, undefined, {}, 'queueTag').source, 'imgur')
  assert.equal(client.options({}, undefined, {}, 'getGame').source, 'sanity')
})

test('API 3.6 falls back to BikeTag for a credential-free clone', () => {
  const client = new BikeTagClient({
    game: 'portland',
    clientKey: null,
    sanity: { projectId: null, dataset: '' },
    imgur: { clientId: null, rapidApiKey: null },
    aws: { accessKeyId: null, secretAccessKey: null },
  })
  client.setGameContext(awsGame)

  assert.equal(client.options({}, undefined, {}, 'getGame').source, 'biketag')
  assert.equal(client.options({}, undefined, {}, 'getTags').source, 'biketag')
})
