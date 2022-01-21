import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import * as Y from 'yjs'
import {
  newHocuspocus, newHocuspocusProvider, flushRedis, redisConnectionSettings,
} from '../utils'

// Checks that data isn’t corrupted when restored from Redis
// https://github.com/ueberdosis/hocuspocus/issues/224#issuecomment-944550576

test.serial.before(async () => {
  return flushRedis()
})

test.serial.after(async () => {
  return flushRedis()
})

// create '#1'
test.serial('document is persisted', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({ ...redisConnectionSettings }),
      ],
    })

    server.enableDebugging()

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const fragment = provider.document.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#1'),
        ])

        t.is(fragment.toString(), '#1')

        resolve('done')
      },
    })
  })
})

// modify '#1#2'
test.serial('document can be modified', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({ ...redisConnectionSettings }),
      ],
    })

    server.enableDebugging()

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const fragment = provider.document.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#2'),
        ])

        t.is(fragment.toString(), '#1#2')

        resolve('done')
      },
    })
  })
})

// restore '#1#2'
test.serial('document can be restored', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({ ...redisConnectionSettings }),
      ],
    })

    server.enableDebugging()

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const fragment = provider.document.getXmlFragment('XMLFragment')
        t.is(fragment.toString(), '#1#2')

        resolve('done')
      },
    })
  })
})
