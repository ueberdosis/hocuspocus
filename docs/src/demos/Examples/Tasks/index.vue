<template>
  <div>
    <strong>Work in progress</strong>
    <ul>
      <li v-for="task in tasks" :key="task[0]">
        <input type="checkbox" v-model="task[1].completed">
        <span @click="editTask(task[0])">
          {{ task[1].text }}
        </span>
        ({{ task[0] }})
        <button @click="deleteTask(task[0])">
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
import { v4 as uuidv4 } from 'uuid'
import { WebsocketProvider } from 'y-websocket'

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

    this.provider = new WebsocketProvider(
      'wss://websocket.tiptap.dev',
      'hocuspocus-demo-task-list',
      ydoc,
    )

    this.tasks = ydoc.getMap('tasks')
  },

  methods: {
    addTask() {
      this.tasks.set(uuidv4(), {
        text: this.newTask,
        completed: false,
      })

      this.newTask = ''
    },
    editTask(id) {
      const task = this.tasks.get(id)

      task.text = window.prompt(task.text)
    },
    deleteTask(id) {
      this.tasks.delete(id)
    },
  },

  beforeDestroy() {
    this.provider.destroy()
  },
}
</script>

<style lang="scss" scoped>
</style>
