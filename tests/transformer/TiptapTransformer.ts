import { describe, expect, test } from 'vite-plus/test'
import { throws } from '../utils/index.ts'

import { TiptapTransformer } from '@hocuspocus/transformer'

describe('TiptapTransformer', () => {
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

    expect(ydoc.getXmlFragment('content').toJSON()).toBe('<paragraph>Example Text</paragraph>')
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

    expect(ydoc.getXmlFragment('mySuperCustomField').toJSON()).toBe(
      '<paragraph>Example Text</paragraph>',
    )
  })

  test('throws a helpful error when the document is empty', async t => {
    const invalidJson = null

    let error: unknown
    try {
      TiptapTransformer.toYdoc(invalidJson, 'content')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(Error)

    expect(error?.message.includes('ProseMirror-compatible JSON')).toBeTruthy()
  })

  test('throws a helpful error when the document is invalid', async t => {
    const invalidJson = {
      type: 'invalidType',
      content: [],
    }

    let error: unknown
    try {
      TiptapTransformer.toYdoc(invalidJson, 'content')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(Error)

    expect(error?.message.includes('Unknown node type: invalidType')).toBeTruthy()
  })
})
