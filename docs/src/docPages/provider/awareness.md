# Awareness

## toc

## Introduction
Through the awareness information about all present users can be shared. It allows you to sync the names, cursor positions, or even coordinates in a complex 3D world, whatever is needed. Under the hood it’s an own CRDT, but doesn’t have history of updates.

## Set your state
Pass a key and a value to set information for the current users, you are free to pass whatever data you would like to share with other users. Here is an example with a name and a hex color under the `user` key:

```js
// Set the awareness field for the current user
provider.setAwarenessField('user', {
  name: 'Kevin Jahns',
  color: '#ffcc00',
})
```

## Listen for changes
Register an event listener to receive and react to any changes, not only for your, but for all awareness states of all connected users:

```js
// Listen for changes to the states of all users
provider.on('awarenessChange', ({ states }) => {
  console.log(states)
})
```

## Usage
Gosh, all those tiny snippets. Here is complete working example of how that could look like in your app:

```js
// Let’s import everything we need
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

// Set up the provider
provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'awareness-example',
  document: new Y.Doc(),
  // Listen for changes …
  onAwarenessChange: ({ states }) => {
    console.log(states)
  }),
})

// Actually set the awareness field for the current user
provider.setAwarenessField('user', {
  name: 'Kevin Jahns',
  color: '#ffcc00',
})


