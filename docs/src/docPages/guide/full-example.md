# Full example

This is a full example of how to integrate hocuspocus in your own application and how to configure it using the examples from the previous chapters of the guide:

```typescript
import { writeFile } from 'fs'
import { Server } from '@hocuspocus/server'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

const hocuspocus = Server.configure({

  port: 6001, // Listen on port 6001
  debounce: 500, // Debounce onChange hook for 0.5s
  debounceMaxWait: 4000, // Set max wait time for debouncing to 4s
  timeout: 20000, // Set connection timeout to 20s

  /* ---------------------------------
   * Authorization and authentication
   * --------------------------------- */
  onConnect(data, resolve, reject) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (requestParameters.access_token !== 'super-secret-token') {
      return reject()
    }

    // You can set contextual data…
    const context = {
      user: {
        id: 1234,
        name: 'John',
      },
    }

    // Output some information
    process.stdout.write(`"${context.user.name}" has connected!`)

    // …and pass it along to use it in other hooks
    resolve(context)
  },

  /* ---------------------------------
   * Load the document
   * --------------------------------- */
  onCreateDocument(data) {
    // Get entity and field information from the document name
    // In this example we would use a document name like "page.140.content"
    const [ entityType, entityID, field ] = data.documentName.split('.')

    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${entityType}/${entityID}/${field}.json`) || "{}"
    )

    // We need the prosemirror schema you're using in the editor
    const schema = new Schema({
      nodes: {
        text: {},
        doc: { content: "text*" },
      },
    })

    // Convert the prosemirror JSON to a Y-Doc
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument)

    // Encode the current state as a Yjs update
    const update = encodeStateAsUpdate(ydoc)

    // And apply the update to the Y-Doc hocuspocus provides
    applyUpdate(data.document, update)
  },

  /* ---------------------------------
   * Handle document changes
   * --------------------------------- */
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

  /* ---------------------------------
   * Handle disconnect
   * --------------------------------- */
  onDisconnect(data) {
    // Output some information
    process.stdout.write(`"${data.context.user.name}" has disconnected!`)
  },
})

hocuspocus.listen()
```
