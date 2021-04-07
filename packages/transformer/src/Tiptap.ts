import { Doc } from 'yjs'
import { Extensions } from '@tiptap/core/dist/packages/core/src/types'
import { getSchema } from '@tiptap/core'
import { defaultExtensions } from '@tiptap/starter-kit'
import { ProsemirrorTransformer } from './Prosemirror'
import { Transformer } from './types'

export class Tiptap implements Transformer {

  defaultExtensions: Extensions = defaultExtensions()

  extensions(extensions: Extensions): Tiptap {
    this.defaultExtensions = extensions

    return this
  }

  fromYdoc(document: Doc, fieldName?: string | Array<string>): any {
    return ProsemirrorTransformer.fromYdoc(document, fieldName)
  }

  toYdoc(document: any, fieldName: string | Array<string> = 'default', extensions?: Extensions): Doc {
    return ProsemirrorTransformer.toYdoc(
      document,
      fieldName,
      getSchema(extensions || this.defaultExtensions),
    )
  }

}

export const TiptapTransformer = new Tiptap()
