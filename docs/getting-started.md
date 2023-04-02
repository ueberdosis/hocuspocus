# Getting Started

The two code examples below show a working example of the backend _and_ frontend to sync an array
with multiple users. We have also added some examples in the [playground folder of the
repo](https://github.com/ueberdosis/hocuspocus/tree/main/playground), that you can start by
running `npm run playground` in the repository root. They are meant for internal usage during Hocuspocus
development, but they might be useful to understand how everything can be used.

## Backend

### Installation

You can install other packages later, let’s start with a basic version for now:

```bash
npm install @hocuspocus/server
```

### Usage

```js
import { Hocuspocus } from "@hocuspocus/server";

// Configure the server …
const server = new Hocuspocus({
  port: 1234,
});

// … and run it!
server.listen();
```

## Frontend

### Installation

```bash
npm install @hocuspocus/provider yjs
```

### Usage

Now, you’ll need to use Y.js in your frontend and connect to the server with the WebSocket provider. With Tiptap, our very own text editor, it’s also just a few lines of code.

```js
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

// Connect it to the backend
const provider = new HocuspocusProvider({
  url: "ws://127.0.0.1:1234",
  name: "example-document",
});

// Define `tasks` as an Array
const tasks = provider.document.getArray("tasks");

// Listen for changes
tasks.observe(() => {
  console.log("tasks were modified");
});

// Add a new task
tasks.push(["buy milk"]);
```
