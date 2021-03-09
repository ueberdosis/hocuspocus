<template>
  <card title="Documents">
    <table class="table-auto w-full text-left">
      <thead>
        <tr>
          <th class="px-4 py-2">Document</th>
          <th class="px-4 py-2">Active connections</th>
          <th class="px-4 py-2">Messages</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(document, index) in sortedDocuments"
          :key="index"
        >
          <td class="border px-4 py-2">{{ document.name }}</td>
          <td class="border px-4 py-2">
            <span class="text-sm text-gray-600">{{ document.connections }}</span>
          </td>
          <td class="border px-4 py-2">
            <span class="text-sm text-gray-600">{{ document.messages }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </card>
</template>

<script>
import collect from 'collect.js'
import Card from './Card'

export default {
  components: {
    Card,
  },

  props: {
    documents: {
      type: Object,
      required: true,
    },
  },

  computed: {
    sortedDocuments() {
      return collect(this.documents)
        .map((data, documentName) => ({
          ...data,
          name: documentName,
        }))
        .values()
        .sortByDesc('connections')
        .toArray()
    },
  },
}
</script>
