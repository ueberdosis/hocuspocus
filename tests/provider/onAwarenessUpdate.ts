import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.js'

test('onAwarenessUpdate callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
      onAwarenessUpdate: ({ states }) => {
        t.is(states.length, 1)
        t.is(states[0].foo, 'bar')

        resolve('done')
      },
    })
  })
})

test('shares awareness state with other users', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.setAwarenessField('name', 'player1')
      },
      onAwarenessUpdate: ({ states }) => {
        const player2 = !!states.filter(state => state.name === 'player2').length

        if (player2) {
          t.is(player2, true)
          resolve('done')
        }
      },
    })

    const anotherProvider = newHocuspocusProvider(server, {
      onConnect() {
        anotherProvider.setAwarenessField('name', 'player2')
      },
      onAwarenessUpdate: ({ states }) => {
        const player1 = !!states.filter(state => state.name === 'player1').length

        if (player1) {
          t.is(player1, true)
        }
      },
    })
  })
})

test('does not share awareness state with users in other documents', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ })

    newHocuspocusProvider(server, {
      async onConnect() {
        await sleep(100)

        t.pass()
        resolve('done')
      },
      onAwarenessUpdate: ({ states }) => {
        const player2 = !!states.filter(state => state.name === 'player2').length

        if (player2) {
          throw new Error('Awareness state leaked!')
        }
      },
    })

    const anotherProvider = newHocuspocusProvider(server, {
      name: 'hocuspocus-completly-different-and-unrelated-document',
      onConnect() {
        anotherProvider.setAwarenessField('name', 'player2')
      },
    })
  })
})
