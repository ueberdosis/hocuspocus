<template>
  <div>
    <strong>Work in progress</strong>
    <ul>
      <li v-for="(task, index) in tasks">
        #{{ index }} {{ task.completed }}
        <span @click="editTask(index)">
          {{ task.text }}
        </span>
        <button @click="deleteTask(index)">
          delete
        </button>
      </li>
    </ul>
    <form @submit.prevent="addTask">
      <input type="text" v-model="newTask">
      <button type="submit">
        add
      </button>
    </form>
  </div>
</template>

<script>
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export default {
  data() {
    return {
      provider: null,
      tasks: [],
      newTask: '',
    }
  },

  mounted() {
    const ydoc = new Y.Doc()
    this.provider = new HocuspocusProvider({
      url: 'wss://websocket.tiptap.dev',
      name: 'hocuspocus-demo-tasks',
      document: ydoc,
    })

    this.tasks = ydoc.getArray('tasks')
  },

  methods: {
    addTask() {
      this.tasks.push([{
        text: this.newTask,
        completed: false,
      }])

      this.newTask = ''
    },
    editTask(index) {
      const task = this.tasks.get(index)
      task.text = window.prompt(task.text)

      // console.log(index, {
      //   ...task,
      //   text,
      // })
      // this.tasks.insert(index, {
      //   ...task,
      //   text,
      // })
    },
    deleteTask(index) {
      this.tasks.delete(index)
    },
  },

  beforeDestroy() {
    this.provider.destroy()
  },
}
</script>

<style lang="scss" scoped>
</style>
