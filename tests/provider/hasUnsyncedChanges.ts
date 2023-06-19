import test from 'ava'
import { retryableAssertion } from 'tests/utils/retryableAssertion'
import * as Y from 'yjs'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test("initially doesn't have unsynced changes", async t => {
  const server = await newHocuspocus()

  const provider = newHocuspocusProvider(server)

  t.is(provider.hasUnsyncedChanges, false)
  t.is(provider.synced, false)
})

test('has unsynced changes when updating', async t => {
  const server = await newHocuspocus()

  const provider = newHocuspocusProvider(server, {
    awareness: undefined,
  })

  provider.document.getMap('test').set('foo', 'bar')
  t.is(provider.hasUnsyncedChanges, true)

  // changes are synced
  await retryableAssertion(t, tt => {
    tt.is(provider.hasUnsyncedChanges, false)
  })
})

test('has unsynced changes when in readonly mode', async t => {
  const server = await newHocuspocus({
    async onAuthenticate({ connection }) {
      connection.readOnly = true
    },
  })

  const provider = newHocuspocusProvider(server, { token: 'readonly' })

  provider.document.getMap('test').set('foo', 'bar')

  await retryableAssertion(t, tt => {
    tt.is(provider.hasUnsyncedChanges, true)
  })

  await sleep(100)

  // confirm that the changes are not synced later either
  t.is(provider.hasUnsyncedChanges, true)
})

test('has no unsynced changes when in readonly mode and no changes', async t => {
  const server = await newHocuspocus({
    async onAuthenticate({ connection }) {
      connection.readOnly = true
    },
  })

  const provider = newHocuspocusProvider(server, { token: 'readonly' })

  // first, unsyncedChanges is briefly set to true when we're waiting for the ack of the initial sync
  await new Promise((resolve, reject) => {
    provider.on('unsyncedChanges', () => {
      provider.off('unsyncedChanges')
      if (provider.hasUnsyncedChanges) {
        resolve('done')
      } else {
        reject()
      }
    })
  })

  // then, it should be set to false when the sync message is confirmed
  await retryableAssertion(t, tt => {
    tt.is(provider.hasUnsyncedChanges, false)
  })
})

test('has unsynced changes when in readonly mode and receiving external update', async t => {
  const server = await newHocuspocus({
    async onAuthenticate({ connection, token }) {
      if (token === 'readonly') {
        connection.readOnly = true
      }
    },
  })

  const provider = newHocuspocusProvider(server, {
    token: 'readonly',
  })

  provider.document.getMap('test').set('foo', 'bar')

  t.is(provider.hasUnsyncedChanges, true)

  await sleep(100)

  t.is(provider.hasUnsyncedChanges, true)

  const provider2 = newHocuspocusProvider(server, {
    token: 'full-access',
  })

  provider2.document.getMap('test2').set('foo', 'bar')

  t.is(provider2.hasUnsyncedChanges, true)

  await retryableAssertion(t, tt => {
    tt.is(provider2.hasUnsyncedChanges, false)
  })

  t.is(provider.hasUnsyncedChanges, true)
})

test('has unsynced changes when in readonly mode and initial document has changed', async t => {
  const server = await newHocuspocus({
    async onAuthenticate({ connection }) {
      connection.readOnly = true
    },
  })

  const document = new Y.Doc()
  document.getMap('test').set('foo', 'bar')

  const provider = newHocuspocusProvider(server, { document, token: 'readonly' })

  await retryableAssertion(t, tt => {
    tt.is(provider.hasUnsyncedChanges, true) // TODO: this also fails
  })

  await sleep(100)

  t.is(provider.hasUnsyncedChanges, true)
})

test('has no unsynced changes when in readonly mode and initial document has not changed', async t => {
  const server = await newHocuspocus({
    async onAuthenticate({ connection }) {
      connection.readOnly = true
    },
  })

  const document = new Y.Doc()

  const provider = newHocuspocusProvider(server, { document, token: 'readonly' })

  await sleep(100)

  t.is(provider.hasUnsyncedChanges, false)
})
