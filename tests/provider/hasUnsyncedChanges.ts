import { describe, expect, test } from 'vite-plus/test'

import * as Y from 'yjs'
import { retryableAssertion } from '../utils/retryableAssertion.ts'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('hasUnsyncedChanges', () => {
  test("initially doesn't have unsynced changes", async t => {
    return new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      expect(provider.hasUnsyncedChanges).toBe(false)
      expect(provider.synced).toBe(false)

      setTimeout(() => {
        expect(provider.hasUnsyncedChanges).toBe(false)
        expect(provider.synced).toBe(true)

        resolve()
      }, 200)
    })
  })

  test('has unsynced changes when updating', async t => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      awareness: undefined,
    })

    provider.document.getMap('test').set('foo', 'bar')
    expect(provider.hasUnsyncedChanges).toBe(true)

    // changes are synced
    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(false)
    })
  })

  test('has unsynced changes when in readonly mode', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig }) {
        connectionConfig.readOnly = true
      },
    })

    const provider = newHocuspocusProvider(server, { token: 'readonly' })

    provider.document.getMap('test').set('foo', 'bar')

    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(true)
    })

    await sleep(100)

    // confirm that the changes are not synced later either
    expect(provider.hasUnsyncedChanges).toBe(true)
  })

  test('has no unsynced changes when in readonly mode and no changes', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig }) {
        connectionConfig.readOnly = true
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
    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(false)
    })
  })

  test('has unsynced changes when in readonly mode and receiving external update', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig, token }) {
        if (token === 'readonly') {
          connectionConfig.readOnly = true
        }
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'readonly',
    })

    provider.document.getMap('test').set('foo', 'bar')

    expect(provider.hasUnsyncedChanges).toBe(true)

    await sleep(100)

    expect(provider.hasUnsyncedChanges).toBe(true)

    const provider2 = newHocuspocusProvider(server, {
      token: 'full-access',
    })

    provider2.document.getMap('test2').set('foo', 'bar')

    expect(provider2.hasUnsyncedChanges).toBe(true)

    await retryableAssertion(() => {
      expect(provider2.hasUnsyncedChanges).toBe(false)
    })

    expect(provider.hasUnsyncedChanges).toBe(true)
  })

  test('has unsynced changes when in readonly mode and initial document has changed', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig }) {
        connectionConfig.readOnly = true
      },
    })

    const document = new Y.Doc()
    document.getMap('test').set('foo', 'bar')

    const provider = newHocuspocusProvider(server, { document, token: 'readonly' })

    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(true)
    })

    await sleep(100)

    expect(provider.hasUnsyncedChanges).toBe(true)
  })

  test('has unsynced changes when in readonly mode and initial document has changed (deletion)', async t => {
    const document = new Y.Doc()
    document.getMap('test').set('foo', 'bar')
    const initialState = Y.encodeStateAsUpdate(document)

    const server = await newHocuspocus({
      async onLoadDocument() {
        return initialState
      },
      async onAuthenticate({ connectionConfig }) {
        connectionConfig.readOnly = true
      },
    })

    document.getMap('test').delete('foo')

    const provider = newHocuspocusProvider(server, { document, token: 'readonly' })

    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(true)
    })

    await sleep(100)

    expect(provider.hasUnsyncedChanges).toBe(true)
  })

  test('has no unsynced changes when in readonly mode and initial document has not changed', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig }) {
        connectionConfig.readOnly = true
      },
    })

    const document = new Y.Doc()

    const provider = newHocuspocusProvider(server, { document, token: 'readonly' })

    await sleep(200)

    expect(provider.hasUnsyncedChanges).toBe(false)
  })
})
