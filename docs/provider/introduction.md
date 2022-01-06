# Introduction
[![Version](https://img.shields.io/npm/v/@hocuspocus/provider.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/provider)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/provider.svg)](https://npmcharts.com/compare/@hocuspocus/provider?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/provider.svg)](https://www.npmjs.com/package/@hocuspocus/provider)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)

Providers are the Y.js way to set up communication between different users, or cache the updates in the browser. Hocuspocus comes with an own provider, which is compatible with all existing providers, but has some nice features on top.

It’s coming with WebSocket message authentication, a debug mode to add verbose output to the console, a few more event hooks, a different reconnection strategy, an improved error handling and a friendly API for the Awareness protocol.

All Y.js providers can be used together. That includes the Hocuspocus provider, and the original [y-websocket](https://github.com/yjs/y-websocket) provider, [y-webrtc](https://github.com/yjs/y-webrtc), [y-indexeddb](https://github.com/yjs/y-indexeddb) (for in-browser caching) or [y-dat](https://github.com/yjs/y-dat) (work in progress). You can use the Hocuspocus server with y-websocket, the Hocuspocus provider with the y-websocket server, the Hocuspocus provider with y-webrtc … whatever you like.
