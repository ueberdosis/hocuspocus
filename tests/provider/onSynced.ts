import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

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

    const provider = newHocuspocusProvider(server, {
      async onSynced() {
        t.deepEqual(provider.document.getArray('foo').get(0), 'bar')

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
