---
title: collaboration backend
---

# hocuspocus
hocuspocus is a plug & play collaboration backend. It’s based on Y.js, a CRDT framework with a powerful abstraction of shared data.

You can use it, to keep multiple instances of text editors in sync, work offline and sync changes later, or sync text between different devices. Also, you can use it to build anything else, that needs to be collaboration, for example a collaborative drawing app.

## Features
**Real-time collaboration.** Share changes, cursors and selection, or even an application state between with other people in real-time.

**Sync multiple devices.** Enable people to edit their data on multiple devices, and keep everything in sync with hocuspocus.

**Work offline.** Store changes in the browser, and wait to upload them. hocuspocus will merge this changes, no matter when they are delivered.

**Conflict-free.** Y.js is a performant, conflict-free replicated data type implementation. Sync all your changes. No matter when they come in, they’ll be merged without conflicts.

**TypeScript.** hocuspocus is written in TypeScript. That helps us to find bugs early and gives you a nice autocomplete for the API (if your IDE supports that) on top of the extensive human written documentation.

**Well documented.** The documentation is a top priority for us, you’ll find a lot of guides, examples and even background knowledge here.

**Scalable.** You can spin up multiple instances of it and keep everything in sync with Redis. Support for Redis clusters is also baked-in.

**Actively maintained.** Hocuspocus comes with a price tag, but that ensures constant development, maintenance and suppport.

## License
You can use hocuspocus in all kinds of projects, you can [buy an appropriate license and download the package](https://store.ueber.io/products/hocuspocus) for $99/year for single developers, and $499/year for teams. Local taxes may apply.
