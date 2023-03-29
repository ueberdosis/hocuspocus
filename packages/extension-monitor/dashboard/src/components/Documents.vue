<template>
  <card>
    <div class="flex flex-col text-sm">
      <div class="flex items-stretch border-b-2 border-black font-bold py-2">
        <div
          class="flex-grow flex-shrink-0"
          style="flex-basis: 10rem;"
        >
          Document
        </div>
        <div
          class="flex-grow flex-shrink-0"
          style="flex-basis: 10rem;"
        >
          Active connections
        </div>
        <div
          class="flex-grow flex-shrink-0"
          style="flex-basis: 10rem;"
        >
          Messages
        </div>
      </div>

      <RecycleScroller
        :items="sortedDocuments"
        :item-size="46"
        key-field="name"
        v-slot="{ item }"
      >
        <div class="flex border-t border-black py-3 hover:bg-yellow-300 items-stretch">
          <div
            class="flex-grow flex-shrink-0"
            style="flex-basis: 10rem;"
          >
            {{ item.name }}
          </div>
          <div
            class="flex-grow flex-shrink-0"
            style="flex-basis: 10rem;"
          >
            {{ item.connections }}
          </div>
          <div
            class="flex-grow flex-shrink-0"
            style="flex-basis: 10rem;"
          >
            {{ item.messages }}
          </div>
        </div>
      </RecycleScroller>
    </div>
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
