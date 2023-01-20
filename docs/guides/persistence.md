---
tableOfContents: true
---

# Persistence

To persist the documents you must instruct the server to:

1. Store in the database the document using the `onChange` hook, or better yet the `onStoreDocument` hook (which is the same as the first one but with debounce already configured).
2. Load from the database the document using the hook `onLoadDocument`.

Actually, you don't even have to use those 2 hooks! We have already created on top of them a simple abstraction in the form of a [database extension](https://tiptap.dev/hocuspocus/server/database-extensions) (example of use in the link).

However, in case you are a curious mind, here is an example of what it would be like to do it with hooks (It can be a good way to familiarize yourself with the concepts).

TO-DO: replace `onChange` with `onStoreDocument`

```ts
import { debounce } from "debounce";
import { Server } from "@hocuspocus/server";
import { Doc } from "yjs";

let debounced;

const server = Server.configure({
  async onChange(data) {
    const save = () => {
      // Save to database. Example:
      // saveToDatabase(data.document, data.documentName);

      // Maybe you want to store the user who changed the document?
      // Guess what, you have access to your custom context from the
      // onAuthenticate hook here. See auth section for more details
      console.log(`Document ${data.documentName} changed by ${data.context.user.name}`);
    };
    debounced?.clear();
    debounced = debounce(() => save, 4000);
    debounced();
  },

  async onLoadDocument(data): Doc {
    return loadFromDatabase(data.documentName) || createInitialDocTemplate();
  },
});

server.listen();

function createInitialDocTemplate() {
  return new Doc();
  // do anything you want here
}
```

## FAQ: In what format should I save my document?

In Uint8Array, [which is the format that Yjs encodes its documents](https://docs.yjs.dev/api/document-updates). You can persist your documents **ALSO** in another format like JSON if for some reason you want to. Other formats can give you the current state of the document, but you need your Y.Doc if you want the historical steps of the document, which is very much what RTC is all about!
