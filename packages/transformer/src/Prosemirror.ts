import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import { yDocToProsemirrorJSON, prosemirrorJSONToYDoc } from 'y-prosemirror'
import { Schema } from 'prosemirror-model'
import { Transformer } from './types'

class Prosemirror implements Transformer {

  defaultSchema: Schema = new Schema({
    nodes: {
      text: {},
      doc: { content: 'text*' },
    },
  })

  schema(schema: Schema): Prosemirror {
    this.defaultSchema = schema

    return this
  }

  fromYdoc(document: Doc, fieldName?: string | Array<string>): any {
    const data = {}

    // allow a single field name
    if (typeof fieldName === 'string') {
      return yDocToProsemirrorJSON(document, fieldName)
    }

    // default to all available fields if the given field name is empty
    if (fieldName === undefined || fieldName.length === 0) {
      fieldName = Array.from(document.share.keys())
    }

    fieldName.forEach(field => {
      // @ts-ignore
      data[field] = yDocToProsemirrorJSON(document, field)
    })

    return data
  }

  toYdoc(document: any, fieldName: string | Array<string> = 'prosemirror', schema?: Schema): Doc {
    if (!document) {
      throw new Error(`You’ve passed an empty or invalid document to the Transformer. Make sure to pass ProseMirror-compatible JSON. Actually passed JSON: ${document}`)
    }

    // allow a single field name
    if (typeof fieldName === 'string') {
      return prosemirrorJSONToYDoc(schema || this.defaultSchema, document, fieldName)
    }

    const ydoc = new Doc()

    fieldName.forEach(field => {
      const update = encodeStateAsUpdate(
        prosemirrorJSONToYDoc(schema || this.defaultSchema, document, field),
      )

      applyUpdate(ydoc, update)
    })

    return ydoc
  }

}

export const ProsemirrorTransformer = new Prosemirror()
