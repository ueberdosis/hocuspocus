<template>
  <card>
    <table class="table-auto w-full text-left text-sm">
      <thead>
        <tr>
          <th class="border-b-2 border-black py-2">Document</th>
          <th class="border-b-2 border-black py-2">Active connections</th>
          <th class="border-b-2 border-black py-2">Messages</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(document, index) in sortedDocuments"
          class="hover:bg-yellow-300"
          :key="index"
        >
          <td class="border-t border-black py-3">{{ document.name }}</td>
          <td class="border-t border-black py-3">{{ document.connections }}</td>
          <td class="border-t border-black py-3">{{ document.messages }}</td>
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
