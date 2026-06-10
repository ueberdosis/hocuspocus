# @hocuspocus/provider-react
[![Version](https://img.shields.io/npm/v/@hocuspocus/provider-react.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/provider-react)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/provider-react.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/provider-react.svg)](https://www.npmjs.com/package/@hocuspocus/provider-react)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

React bindings for the [Hocuspocus provider](../provider). Wraps the provider in components and hooks so React handles the lifecycle — including StrictMode double-mounts. Built on `useSyncExternalStore`.

## Installation

```bash
npm install @hocuspocus/provider @hocuspocus/provider-react yjs
```

Requires React 18 or 19.

## Usage

Wrap your collaborative subtree with `HocuspocusProviderWebsocketComponent` (shared WebSocket) and one or more `HocuspocusRoom`s (one per document). Inside the room, hooks give you the provider and its state:

```tsx
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusProvider,
  useHocuspocusConnectionStatus,
} from "@hocuspocus/provider-react"

function Editor() {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  // wire provider.document / provider.awareness into your editor
  return <div>{status}</div>
}

export function App() {
  return (
    <HocuspocusProviderWebsocketComponent url="ws://127.0.0.1:1234">
      <HocuspocusRoom name="example-document" token="super-secret-token">
        <Editor />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
```

To use with Tiptap, pass `provider.document` into the `Collaboration` extension and `provider` into `CollaborationCaret` — see the [collaborative editing guide](https://tiptap.dev/docs/hocuspocus/guides/collaborative-editing) for a full example.

## Exports

**Components**

- `HocuspocusProviderWebsocketComponent` — manages the shared WebSocket
- `HocuspocusRoom` — creates a per-document provider on the shared socket; StrictMode-safe

**Hooks** (must be used inside a `HocuspocusRoom`)

- `useHocuspocusProvider()` — the `HocuspocusProvider` instance
- `useHocuspocusConnectionStatus()` — `'connecting' | 'connected' | 'disconnected'`
- `useHocuspocusSyncStatus()` — `'synced' | 'syncing'`
- `useHocuspocusAwareness()` — array of connected users' awareness state
- `useHocuspocusEvent(name, handler)` — subscribe to any provider event

## Documentation

Full components, hooks, and patterns reference: [tiptap.dev/docs/hocuspocus/provider/react](https://tiptap.dev/docs/hocuspocus/provider/react).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
