# Full example

## Full example

```typescript
import { writeFile } from 'fs'
import { Server } from '@hocuspocus/server'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

const hocuspocus = Server.configure({

  port: 6001, // Listen on port 6001
  debounce: 500, // Debounce onChange hook for 0.5s
  debounceMaxWait: 4000, // Set max wait time for debouncing to 4s
  timeout: 20000, // Set connection timeout to 20s

  onChange(data) {

    // Get entity and field information from the document name
    const [ entityType, entityID, field ] = data.documentName.split('.')

    // Get the underlying Y-Doc
    const ydoc = data.document

    // Convert the y-doc to the format your editor uses, in this
    // example Prosemirror JSON for the tiptap editor
    const prosemirrorDocument = yDocToProsemirrorJSON(ydoc)

    // Save your document. In a real-world app this could be a database query
    // a webhook or something else
    writeFile(
      `/path/to/your/documents/${entityType}/${entityID}/${field}.json`,
      prosemirrorDocument
    )

  },
})

hocuspocus.listen()
```
