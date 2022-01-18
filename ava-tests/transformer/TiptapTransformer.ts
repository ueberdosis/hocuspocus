import test from 'ava'
import { TiptapTransformer } from '@hocuspocus/transformer'

test('transforms JSON to Y.Doc', async t => {
  const json = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Example Text',
          },
        ],
      },
    ],
  }

  const ydoc = TiptapTransformer.toYdoc(json, 'content')

  t.is(
    ydoc.getXmlFragment('content').toJSON(),
    '<paragraph>Example Text</paragraph>',
  )
})

test('writes to the correct Y.Doc field', async t => {
  const json = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Example Text',
          },
        ],
      },
    ],
  }

  const ydoc = TiptapTransformer.toYdoc(json, 'mySuperCustomField')

  t.is(
    ydoc.getXmlFragment('mySuperCustomField').toJSON(),
    '<paragraph>Example Text</paragraph>',
  )
})

test('throws a helpful error when the document is empty', async t => {
  const invalidJson = null

  const error = t.throws(() => {
    TiptapTransformer.toYdoc(invalidJson, 'content')
  }, { instanceOf: Error })

  t.truthy(error?.message.includes('ProseMirror-compatible JSON'))
})

test('throws a helpful error when the document is invalid', async t => {
  const invalidJson = {
    type: 'invalidType',
    content: [],
  }

  const error = t.throws(() => {
    TiptapTransformer.toYdoc(invalidJson, 'content')
  }, { instanceOf: Error })

  t.truthy(error?.message.includes('Unknown node type: invalidType'))
})
