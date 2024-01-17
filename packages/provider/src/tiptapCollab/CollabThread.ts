import * as Y from 'yjs'
import { v4 as uuid } from 'uuid'
import { CollabComment, CollabCommentOptions } from './CollabComment'

export type CollabThreadOptions = {
  id?: string,
  active: boolean,
  createdAt: number,
  updatedAt: number,
  from: number,
  to: number,
  comments: CollabCommentOptions[],
  data: Record<string, any>
}

export class CollabThread {
  id: string

  active: boolean

  createdAt: number

  updatedAt: number

  from: number

  to: number

  comments: CollabComment[]

  data: Record<string, any>

  map: Y.Map<any>

  constructor(options: CollabThreadOptions, map?: Y.Map<any>) {
    const id = options.id || uuid()

    const {
      active,
      createdAt,
      updatedAt,
      from,
      to,
      comments,
      data,
    } = options

    this.map = map || new Y.Map()

    this.id = id
    this.active = active
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.from = from
    this.to = to
    this.comments = []
    this.data = data

    this.setId(id)
    this.setActive(active)
    this.setCreatedAt(createdAt)
    this.setUpdatedAt(updatedAt)
    this.setFrom(from)
    this.setTo(to)
    this.setData(data)

    comments.forEach(comment => {
      this.createComment(comment)
    })
  }

  update(options: Partial<CollabThreadOptions> = {}) {
    const {
      active, comments, createdAt, data, from, id, to, updatedAt,
    } = options

    if (id) {
      this.setId(id)
    }

    if (active !== undefined) {
      this.setActive(active)
    }

    if (createdAt) {
      this.setCreatedAt(createdAt)
    }

    if (updatedAt) {
      this.setUpdatedAt(updatedAt)
    }

    if (from !== undefined) {
      this.setFrom(from)
    }

    if (to !== undefined) {
      this.setTo(to)
    }

    if (data) {
      this.setData(data)
    }

    if (comments) {
      comments.forEach(comment => {
        this.createComment(comment)
      })
    }
  }

  static fromMap(map: Y.Map<any>) {
    const id = map.get('id') as string
    const active = map.get('active') as boolean
    const createdAt = map.get('createdAt') as number
    const updatedAt = map.get('updatedAt') as number
    const from = map.get('from') as number
    const to = map.get('to') as number
    const yComments = map.get('comments') as Y.Array<Y.Map<any>>
    const data = map.get('data')

    const comments = yComments.map(yComment => {
      return CollabComment.fromMap(yComment)
    })

    return new CollabThread({
      id,
      active,
      createdAt,
      updatedAt,
      from,
      to,
      comments,
      data,
    }, map)
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

  setFrom(from: number) {
    this.from = from
    this.map.set('from', from)
  }

  setTo(to: number) {
    this.to = to
    this.map.set('to', to)
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

  createComment(options: Omit<CollabCommentOptions, 'id'>) {
    const comment = new CollabComment(options)
    this.comments.push(comment)
    this.map.get('comments').push([comment.map])
  }

  updateComment(id: CollabComment['id'], data: Omit<Partial<CollabCommentOptions>, 'id'>) {
    const index = this.comments.findIndex(comment => comment.id === id)

    if (index === -1) {
      return
    }

    const comment = this.comments[index]

    if (data.active !== undefined) {
      comment.setActive(data.active)
    }

    if (data.content) {
      comment.setContent(data.content)
    }

    if (data.createdAt) {
      comment.setCreatedAt(data.createdAt)
    }

    if (data.data) {
      comment.setData(data.data)
    }

    if (data.updatedAt) {
      comment.setUpdatedAt(data.updatedAt)
    }
  }

  deleteComment(id: CollabComment['id']) {
    const index = this.comments.findIndex(comment => comment.id === id)

    if (index === -1) {
      return
    }

    this.comments.splice(index, 1)
    this.map.get('comments').delete(index, 1)
  }
}
