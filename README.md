# tiptap collaboration server
<!-- [![Version](https://img.shields.io/npm/v/@tiptap/collaboration-server.svg?label=version)](https://www.npmjs.com/package/@tiptap/collaboration-server)
[![Downloads](https://img.shields.io/npm/dm/@tiptap/collaboration-server.svg)](https://npmcharts.com/compare/@tiptap/collaboration-server?minimal=true)
[![License](https://img.shields.io/npm/l/@tiptap/collaboration-server.svg)](https://www.npmjs.com/package/@tiptap/collaboration-server) -->
[![Build Status](https://github.com/ueberdosis/tiptap-collaboration-server/workflows/build/badge.svg)](https://github.com/ueberdosis/tiptap-collaboration-server/actions)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

This is a WebSocket Server based on [Y.js](https://github.com/yjs/yjs), which plays really well with tiptap, a headless rich text editor based on [ProseMirror](https://github.com/ProseMirror/prosemirror). It’s the easiest way to get a collaborative backend up and running.

## Usage
```js
import { CollaborationServer } from '@tiptap/collaboration-server'

const server = CollaborationServer.create({
  port: 1234,
})

server.listen()
```

## Documentation
Read more about collaborative editing with tiptap, the configuration of the server and everything you need to know in [the official tiptap documentation](https://next.tiptap.dev/guide/collaborative-editing).

## Development
1. Install dependencies with `$ yarn install`
2. Start the development server `$ yarn start:development`

## Tasks
Required
- [ ] Set up lerna
- [ ] Publish on npm
- [ ] Create new repository for the tiptap documentation example server (e. g. `tiptap-collaboration-server-demo`)
- [ ] Add Docker Setup
- [ ] Deploy demo to Servivum

Optional
- [ ] Write tests?
- [ ] HTTP Callbacks
- [ ] Test with a dummy Laravel application
- [ ] Add Redis support

## 💖 Sponsor the development
Are you using tiptap in production? We need your sponsorship to maintain, update and develop tiptap. [Become a Sponsor now!](https://github.com/sponsors/ueberdosis)

## License
The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
