import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import {
  newHocuspocus, newHocuspocusProvider, flushRedis, redisConnectionSettings,
} from '../utils'

test.serial.before(() => {
  flushRedis()
})

test.serial.after(() => {
  flushRedis()
})

test.serial('document is persisted', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({ ...redisConnectionSettings }),
      ],
    })

    const client = newHocuspocusProvider(server, {
      // foo.0 = 'bar'
      onSynced() {
        const valueBefore = client.document.getArray('foo').get(0)
        t.is(valueBefore, undefined)

        client.document.getArray('foo').insert(0, ['bar'])
        resolve('done')
      },
    })
  })
})

test.skip('document can be restored', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({ ...redisConnectionSettings }),
      ],
    })

    const client = newHocuspocusProvider(server, {
      // foo.0 === 'bar'
      onSynced() {
        const value = client.document.getArray('foo').get(0)
        t.is(value, 'bar')
        resolve('done')
      },
    })
  })
})
