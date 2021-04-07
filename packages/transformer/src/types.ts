import { Doc } from 'yjs'

export interface Transformer {
  fromYdoc: (document: Doc, fieldName?: string | Array<string>) => any,
  toYdoc: (document: any, fieldName: string) => Doc,
}
