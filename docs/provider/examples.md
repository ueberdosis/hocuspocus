---
tableOfContents: true
---

# Examples

## Tiptap

[Tiptap](https://tiptap.dev) is a headless text editor, that’s fully customizable and has a first-class collaborative editing integration that’s compatible with Hocuspocus.

The below example code shows everything you need to create an instance of Tiptap, with all default extension, start your collaboration backend with Hocuspocus and connect everything.

Add an element to your HTML document where Tiptap should be initialized:

```html
<div class="element"></div>
```

Install the required extensions:

```bash
npm install @hocuspocus/provider @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs y-prosemirror
```

And create your Tiptap instance:

```js
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc();

const provider = new HocuspocusProvider({
  url: "ws://127.0.0.1",
  name: "example-document",
  document: ydoc,
});

new Editor({
  element: document.querySelector(".element"),
  extensions: [
    StarterKit.configure({
      history: false,
    }),
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider,
      user: { name: "John Doe", color: "#ffcc00" },
    }),
  ],
});
```

## CodeMirror

```js
import * as Y from "yjs";
import { CodemirrorBinding } from "y-codemirror";
import { WebsocketProvider } from "y-websocket";
import CodeMirror from "codemirror";

const ydoc = new Y.Doc();
var provider = new WebsocketProvider(
  "wss://websocket.tiptap.dev",
  "hocuspocus-demos-codemirror",
  ydoc
);
const yText = ydoc.getText("codemirror");
const yUndoManager = new Y.UndoManager(yText);

const editor = CodeMirror(document.querySelector(".editor"), {
  mode: "javascript",
  lineNumbers: true,
});

const binding = new CodemirrorBinding(yText, editor, provider.awareness, { yUndoManager });
```

Learn more: https://github.com/yjs/y-codemirror

## Monaco

```js
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import * as monaco from "monaco-editor";

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === "json") {
      return "/monaco/dist/json.worker.bundle.js";
    }
    if (label === "css") {
      return "/monaco/dist/css.worker.bundle.js";
    }
    if (label === "html") {
      return "/monaco/dist/html.worker.bundle.js";
    }
    if (label === "typescript" || label === "javascript") {
      return "/monaco/dist/ts.worker.bundle.js";
    }
    return "/monaco/dist/editor.worker.bundle.js";
  },
};

window.addEventListener("load", () => {
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider(
    "wss://websocket.tiptap.dev",
    "hocuspocus-demos-monaco",
    ydoc
  );
  const type = ydoc.getText("monaco");

  const editor = monaco.editor.create(document.querySelector(".editor"), {
    value: "",
    language: "javascript",
    theme: "vs-dark",
  });
  const monacoBinding = new MonacoBinding(
    type,
    editor.getModel(),
    new Set([editor]),
    provider.awareness
  );

  window.example = { provider, ydoc, type, monacoBinding };
});
```

Learn more: https://github.com/yjs/y-monaco

## Quill

```js
import Quill from "quill";
import QuillCursors from "quill-cursors";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import { WebsocketProvider } from "y-websocket";

Quill.register("modules/cursors", QuillCursors);

var ydoc = new Y.Doc();
var type = ydoc.getText("quill");
var provider = new WebsocketProvider("wss://websocket.tiptap.dev", "hocuspocus-demos-quill", ydoc);

var quill = new Quill(".editor", {
  theme: "snow",
  modules: {
    cursors: true,
    history: {
      userOnly: true,
    },
  },
});

new QuillBinding(type, quill, provider.awareness);
```

Learn more: https://github.com/yjs/y-quill

## Lexical

```tsx
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import * as Y from "yjs";
import { TiptapCollabProvider } from "@hocuspocus/provider";

export default function Editor({
  initialEditorState,
  key
}: {
  initialEditorState: string | null;
  key: string;
}) {
  return (
    <LexicalComposer
      key={key}
      initialConfig={{
        editorState: null,
        namespace: "test",
      }}
    >
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <CollaborationPlugin
        id={key}
        providerFactory={createWebsocketProvider}
        initialEditorState={initialEditorState}
        shouldBootstrap={true}
      />
    </LexicalComposer>
);
}

function createWebsocketProvider(
  id: string,
  yjsDocMap: Map<string, Y.Doc>
): Provider {
  const doc = new Y.Doc();
  yjsDocMap.set(id, doc);

// @TODO: REPLACE APP ID
// @TODO: PUT PROPER TOKEN
// @TODO: OR USE `HocuspocusProvider` with Hocuspocus URL
  const hocuspocusProvider = new TiptapCollabProvider({
    appId: 'YOUR_APP_ID',
    name: `lexical-${id}`,
    token: 'YOUR_TOKEN',
    document: doc,
  });

  return hocuspocusProvider;
}
```

## Slate (Draft)

Learn more: https://github.com/BitPhinix/slate-yjs

## Multiplexing

In order to use multiplexing (i.e. opening multiple documents over the same websocket connection) with TiptapCollab or Hocuspocus, you'll need to create the socket and the provider separately.
The example below will show how it works with TiptapCollab, but you can just replace `TiptapCollabProviderWebsocket` with `HocuspocusProviderWebsocket` and `TiptapCollabProvider` with `HocuspocusProvider` for use with Hocuspocus.

Note that the authentication has to be taken care of per document, thus `token` is part of the Provider, not the ProviderWebsocket.
```typescript
import {
  TiptapCollabProvider,
  TiptapCollabProviderWebsocket
} from "@hocuspocus/provider";

const socket = new TiptapCollabProviderWebsocket({
  appId: '', // or `url` if using `HocuspocusProviderWebsocket`
})

const provider1 = new TiptapCollabProvider({
  websocketProvider: socket,
  name: 'document1',
  token: '',
})

const provider2 = new TiptapCollabProvider({
  websocketProvider: socket,
  name: 'document2',
  token: '',
})


```
