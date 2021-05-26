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
})
