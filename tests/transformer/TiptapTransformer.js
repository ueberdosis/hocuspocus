import assert from 'assert'
import { TiptapTransformer } from '../../packages/transformer/src'

context('transformer/TiptapTransformer', () => {
  it('transforms JSON to Y.Doc', () => {
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

    assert.strictEqual(
      ydoc.getXmlFragment('content').toJSON(),
      '<paragraph>Example Text</paragraph>',
    )
  })

  it('writes to the correct Y.Doc field', () => {
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

    assert.strictEqual(
      ydoc.getXmlFragment('mySuperCustomField').toJSON(),
      '<paragraph>Example Text</paragraph>',
    )
  })

  it('throws a helpful error when the document is empty', () => {
    const invalidJson = null

    assert.throws(() => {
      TiptapTransformer.toYdoc(invalidJson, 'content')
    }, /ProseMirror-compatible JSON/)
  })

  it('throws a helpful error when the document is invalid', () => {
    const invalidJson = {
      type: 'invalidType',
      content: [],
    }

    assert.throws(() => {
      TiptapTransformer.toYdoc(invalidJson, 'content')
    }, /Unknown node type: invalidType/)
  })
})
