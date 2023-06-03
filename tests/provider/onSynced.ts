import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.js'

test('onSynced callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    newHocuspocusProvider(server, {
      onSynced() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('synced') callback is executed", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('synced', () => {
      t.pass()
      resolve('done')
    })
  })
})

test('onSynced callback is executed, even when the onConnect takes longer', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect(data) {
        await sleep(100)
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('onSynced callback is executed when the document is actually synced', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onLoadDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const value = provider.document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })
  })
})

test('send all messages according to the protocol', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onLoadDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })

    server.enableDebugging()

    newHocuspocusProvider(server, {
      async onSynced() {
        // timeout is required as "synced" is triggered before last SyncStep2 is sent to server
        await sleep(200)

        // In a provider-server model, you want to handle this differently: The provider should initiate the connection with SyncStep1.
        // When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The provider replies
        // with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
        // provider knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
        // easily be implemented on top of http and websockets. 2. The server should only reply to requests, and not initiate them.
        // Therefore it is necessary that the provider initiates the sync.
        // Source: https://github.com/yjs/y-protocols/blob/master/sync.js#L23-L28

        // Expected (according to the protocol)
        t.deepEqual(server.getMessageLogs(), [
          { direction: 'in', type: 'Sync', category: 'SyncStep1' },
          { direction: 'out', type: 'Sync', category: 'SyncStep2' },
          { direction: 'out', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Awareness', category: 'Update' },
          { direction: 'in', type: 'Sync', category: 'SyncStep2' },
        ])

        resolve('done')
      },
    })
  })
})

test('onSynced callback is executed when the document is actually synced, even if it takes longer', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onLoadDocument({ document }) {
        await sleep(100)

        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const value = provider.document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })
  })
})
