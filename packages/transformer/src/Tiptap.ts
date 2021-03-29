import { Doc } from 'yjs'
import { Extensions } from '@tiptap/core/dist/packages/core/src/types'
import { getSchema } from '@tiptap/core'
import { ProsemirrorTransformer } from './Prosemirror'
import { Transformer } from './types'

export class TiptapTransformer implements Transformer {

  static fromYdoc(document: Doc, fieldName: string | Array<string> = []): any {
    return ProsemirrorTransformer.fromYdoc(document, fieldName)
  }

  static toYdoc(document: any, extensions: Extensions, fieldName: string | Array<string> = 'default'): Doc {
    return ProsemirrorTransformer.toYdoc(document, getSchema(extensions), fieldName)
  }

}
