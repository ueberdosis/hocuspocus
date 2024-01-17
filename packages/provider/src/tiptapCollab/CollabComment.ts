import * as Y from 'yjs'
import { v4 as uuid } from 'uuid'

export type CollabCommentOptions = {
  id?: string,
  active: boolean,
  createdAt: number,
  updatedAt: number,
  data: Record<string, any>,
  content: any,
}

export class CollabComment {
  id: string

  active: boolean

  createdAt: number

  updatedAt: number

  data: Record<string, any>

  content: any

  map: Y.Map<any>

  static fromMap(map: Y.Map<any>) {
    const id = map.get('id') as string
    const active = map.get('active') as boolean
    const createdAt = map.get('createdAt') as number
    const updatedAt = map.get('updatedAt') as number
    const data = map.get('data') as Record<string, any>
    const content = map.get('content') as any

    return new CollabComment({
      id,
      active,
      createdAt,
      updatedAt,
      data,
      content,
    }, map)
  }

  constructor(options: CollabCommentOptions, map?: Y.Map<any>) {
    const id = options.id || uuid()

    const {
      active,
      createdAt,
      updatedAt,
      data,
      content,
    } = options

    this.id = id
    this.active = active
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.content = content
    this.data = data

    this.map = map || new Y.Map()

    this.setId(id)
    this.setActive(active)
    this.setCreatedAt(createdAt)
    this.setUpdatedAt(updatedAt)
    this.setContent(content)
    this.setData(data)
  }

  setId(id: string) {
    this.id = id
    this.map.set('id', id)
  }

  setActive(active: boolean) {
    this.active = active
    this.map.set('active', active)
  }

  setCreatedAt(createdAt: number) {
    this.createdAt = createdAt
    this.map.set('createdAt', createdAt)
  }

  setUpdatedAt(updatedAt: number) {
    this.updatedAt = updatedAt
    this.map.set('updatedAt', updatedAt)
  }

  setContent(content: any) {
    this.content = content
    this.map.set('content', content)
  }

  setData(data: Record<string, any>) {
    this.data = data

    Object.keys(this.data).forEach(key => {
      (this.map.get('data') as Y.Map<any>).set(key, this.data[key])
    })

    // eslint-disable-next-line no-restricted-syntax
    for (const key of (this.map.get('data') as Y.Map<any>).keys()) {
      if (!this.data[key]) {
        (this.map.get('data') as Y.Map<any>).delete(key)
      }
    }
  }
}
