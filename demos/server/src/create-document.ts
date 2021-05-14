// import { Logger } from '../../../packages/logger/src'
// import { RocksDB } from '../../../packages/rocksdb/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

const getProseMirrorJSON = (text: string) => {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  }
}

const server = Server.configure({
  port: 1234,
  extensions: [
    // new Logger(),
    // new RocksDB(),
  ],

  // TODO: This breaks everything
  // If the onConnect hook isn’t resolved fast enough,
  // * other clients don’t receive the initial document
  // * the provider never fires the 'synced' event
  async onConnect(data) {
    await new Promise(resolve => setTimeout(() => {
      console.log('Resolve onConnect hook (after 1337ms)')
      // @ts-ignore
      resolve()
    }, 1337))
  },

  async onCreateDocument(data: onCreateDocumentPayload) {
    if (data.document.isEmpty('default')) {
      const defaultField = TiptapTransformer.toYdoc(
        getProseMirrorJSON('What is love?'),
        'default',
      )

      data.document.merge(defaultField)
    }

    if (data.document.isEmpty('secondary')) {
      const secondaryField = TiptapTransformer.toYdoc(
        getProseMirrorJSON('Baby don\'t hurt me…'),
        'secondary',
      )

      data.document.merge(secondaryField)
    }

    return data.document
  },
})

server.listen()
