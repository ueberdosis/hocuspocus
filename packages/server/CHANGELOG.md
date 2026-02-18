# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.4.4...v4.0.0-rc.0) (2026-02-18)


### Bug Fixes

* check code is type number ([#1062](https://github.com/ueberdosis/hocuspocus/issues/1062)) ([6dfa610](https://github.com/ueberdosis/hocuspocus/commit/6dfa610b35fa1aab7a7f0dd2f2a216cc3094612f))
* onLoadDocument now accepts a yjs update (Uint8Array or Buffer) or a Y.Doc. fixes [#795](https://github.com/ueberdosis/hocuspocus/issues/795), [#271](https://github.com/ueberdosis/hocuspocus/issues/271) ([667e145](https://github.com/ueberdosis/hocuspocus/commit/667e14535d2da3986ecc731b18c976b3662552aa))
* optimize memory usage by creating message uint8arrays once, not per connection ([#1051](https://github.com/ueberdosis/hocuspocus/issues/1051)) ([ad398a8](https://github.com/ueberdosis/hocuspocus/commit/ad398a8304908068df8e11c87edf9962f416751a))
* reset auth state on failed auth, so a new auth message can run auth hooks again. fixes [#944](https://github.com/ueberdosis/hocuspocus/issues/944) ([#1065](https://github.com/ueberdosis/hocuspocus/issues/1065)) ([81ce838](https://github.com/ueberdosis/hocuspocus/commit/81ce8382a80509bad7d8c6581ff87e9d91b26179))
* trigger storeDocumentHooks on any change to the doc (except if incoming via redis). Before, it was easy to accidentally prevent changes from being saved by forgetting to include an origin in the Yjs update ([81975e7](https://github.com/ueberdosis/hocuspocus/commit/81975e7a38b4b594024863278e61ce5ecf318121))


### Features

* add generic `Context` support across server classes and hooks ([#1057](https://github.com/ueberdosis/hocuspocus/issues/1057)) ([67741a0](https://github.com/ueberdosis/hocuspocus/commit/67741a0661004f1d222795bb99e68d27a5a701aa))
* better type safety for yjs origin. Improve type safety and allow any yjs operation to skip store document hooks. ([5f480cd](https://github.com/ueberdosis/hocuspocus/commit/5f480cd07de378704a8b13780460e43ab7917655))
* cross-ws (bun, deno, cloudflare, node uwebsocket) ([#1056](https://github.com/ueberdosis/hocuspocus/issues/1056)) ([2666542](https://github.com/ueberdosis/hocuspocus/commit/2666542aafafb6b055c6ac7b22ba50a6f28d4e9a))
* migrate to pnpm ([#1061](https://github.com/ueberdosis/hocuspocus/issues/1061)) ([dcaab57](https://github.com/ueberdosis/hocuspocus/commit/dcaab571bad694e48efd41bbb1d675855a7e2055))
* pass context when using DirectConnection. Do not run storeDocumentHooks on any transact, just on disconnect ([ffa32b7](https://github.com/ueberdosis/hocuspocus/commit/ffa32b7a96a15d953b031df1005df6cfe7624d51))
* process update message in the order that they are received ([#1058](https://github.com/ueberdosis/hocuspocus/issues/1058)) ([b6162ac](https://github.com/ueberdosis/hocuspocus/commit/b6162ac9154d0e56bca748917e4ebe1e3fb071cf))





## [3.4.6-rc.2](https://github.com/ueberdosis/hocuspocus/compare/v3.4.6-rc.1...v3.4.6-rc.2) (2026-02-03)

**Note:** Version bump only for package @hocuspocus/server





## [3.4.6-rc.1](https://github.com/ueberdosis/hocuspocus/compare/v3.4.6-rc.0...v3.4.6-rc.1) (2026-02-03)

**Note:** Version bump only for package @hocuspocus/server





## [3.4.6-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.4.5-rc.0...v3.4.6-rc.0) (2026-02-03)

**Note:** Version bump only for package @hocuspocus/server





## [3.4.5-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.4.4...v3.4.5-rc.0) (2026-02-03)

**Note:** Version bump only for package @hocuspocus/server





## [3.4.4](https://github.com/ueberdosis/hocuspocus/compare/v3.4.3...v3.4.4) (2026-01-25)


### Bug Fixes

* fixes typings for onTokenSync ([b2ac132](https://github.com/ueberdosis/hocuspocus/commit/b2ac13250b2ddc6bb41ce456b56bac8db2a6e0d5))





## [3.4.3](https://github.com/ueberdosis/hocuspocus/compare/v3.4.2...v3.4.3) (2025-12-15)

**Note:** Version bump only for package @hocuspocus/server





## [3.4.2](https://github.com/ueberdosis/hocuspocus/compare/v3.4.1...v3.4.2) (2025-12-15)


### Bug Fixes

* fixes memory leak under high load, replace nextTick by setTimeout ([1f0b5a4](https://github.com/ueberdosis/hocuspocus/commit/1f0b5a4f9084c0b6e01ddd19ec831d2e2664fc23))





## [3.4.1](https://github.com/ueberdosis/hocuspocus/compare/v3.4.0...v3.4.1) (2025-12-09)

**Note:** Version bump only for package @hocuspocus/server





# [3.4.0](https://github.com/ueberdosis/hocuspocus/compare/v3.3.2...v3.4.0) (2025-10-24)


### Bug Fixes

* fixes timing issues with debouncer: new debounced functions may start before the previous had finished ([708bfdb](https://github.com/ueberdosis/hocuspocus/commit/708bfdb0197833d5d6371b4f2c930fe815a66d15))
* make beforeSync not async, as this may break message processing order (see https://github.com/yjs/yjs/issues/591) ([abeb298](https://github.com/ueberdosis/hocuspocus/commit/abeb2985d522539d30ea96217417a300569f77fd))
* make handleUpdate sync to avoid timing issues ([9a6485b](https://github.com/ueberdosis/hocuspocus/commit/9a6485b9c0ee2f193e9ba68b39a8c93196a796bf))


### Features

* adds Document.lastChangeTime, which is set to Date.now() whenever a change on the documment has been detected ([9092efd](https://github.com/ueberdosis/hocuspocus/commit/9092efd604f20e1ec5228a93dd8b1ee9b48d5e98))





## [3.3.2](https://github.com/ueberdosis/hocuspocus/compare/v3.3.1...v3.3.2) (2025-10-23)


### Reverts

* Revert "fix: temporarily removes beforeSync callback (#919, partially reverts a6a7bcd0768378908ffb5d32096183280115631b). Making applySync async causes timing issues that leads to issues when using PermanentUserData. This can be reproduced by using the playground server with sqlite and a sleep(1000). Additionally, use Y.PermanentUserData, or try to read data from the ydoc in the onSynced event." ([e33dbe2](https://github.com/ueberdosis/hocuspocus/commit/e33dbe22d6ec98279699e11ef6d5bb224299e2d3)), closes [#919](https://github.com/ueberdosis/hocuspocus/issues/919)





## [3.3.1](https://github.com/ueberdosis/hocuspocus/compare/v3.3.0...v3.3.1) (2025-10-22)


### Bug Fixes

* temporarily removes beforeSync callback ([#919](https://github.com/ueberdosis/hocuspocus/issues/919), partially reverts a6a7bcd0768378908ffb5d32096183280115631b). Making applySync async causes timing issues that leads to issues when using PermanentUserData. This can be reproduced by using the playground server with sqlite and a sleep(1000). Additionally, use Y.PermanentUserData, or try to read data from the ydoc in the onSynced event. ([7192664](https://github.com/ueberdosis/hocuspocus/commit/719266443e13e0dab3f69cd8e10b29da547ceab1))





# [3.3.0](https://github.com/ueberdosis/hocuspocus/compare/v3.2.6...v3.3.0) (2025-10-22)


### Bug Fixes

* fixes timing issues when multiple users leave the same document together ([70e5955](https://github.com/ueberdosis/hocuspocus/commit/70e59553e95acbeaf170e0e5a13ea14cfd4ff152))


### Features

* add onTokenSync hook for auth token re-sync ([#1001](https://github.com/ueberdosis/hocuspocus/issues/1001)) ([ee252fb](https://github.com/ueberdosis/hocuspocus/commit/ee252fb99ea6faf80cc71d2e1ce51726e698b76b))





## [3.2.6](https://github.com/ueberdosis/hocuspocus/compare/v3.2.5...v3.2.6) (2025-10-17)


### Bug Fixes

* bind onUpdate before afterLoadDocument, as changes wont be saved otherwise ([bf8a6f9](https://github.com/ueberdosis/hocuspocus/commit/bf8a6f9b2902a81664bbbba8e8a34f7112570d2a))





## [3.2.5](https://github.com/ueberdosis/hocuspocus/compare/v3.2.4...v3.2.5) (2025-10-07)


### Bug Fixes

* delay adding document to instance until connection is about to be established ([#972](https://github.com/ueberdosis/hocuspocus/issues/972)) ([1e2917a](https://github.com/ueberdosis/hocuspocus/commit/1e2917aacb342c035645bb3c01af4910d699eaad))
* set max listeners to infinity to avoid warnings when using multiplexing ([21412aa](https://github.com/ueberdosis/hocuspocus/commit/21412aa3f4bc861fa4ece46c2e57d5a0a48be8af))


### Features

* remove uuid dependency and replace usages by crypto.randomUUID ([#1005](https://github.com/ueberdosis/hocuspocus/issues/1005)) ([393189f](https://github.com/ueberdosis/hocuspocus/commit/393189fe448c68cbd741642866be4b4b23546f17))





## [3.2.4](https://github.com/ueberdosis/hocuspocus/compare/v3.2.3...v3.2.4) (2025-09-30)

**Note:** Version bump only for package @hocuspocus/server





## [3.2.3](https://github.com/ueberdosis/hocuspocus/compare/v3.2.2...v3.2.3) (2025-08-06)


### Bug Fixes

* unload document in catch block of storeDocumentHooks ([#955](https://github.com/ueberdosis/hocuspocus/issues/955)) ([1a3b5b8](https://github.com/ueberdosis/hocuspocus/commit/1a3b5b8b2057e11ea16068f17efadd5c93437276))


### Features

* adds more error logging when a connection is closed due to an exception ([1c4090c](https://github.com/ueberdosis/hocuspocus/commit/1c4090cc464d724e74143296b6e05bde87f5f5bf))





## [3.2.2](https://github.com/ueberdosis/hocuspocus/compare/v3.2.1...v3.2.2) (2025-07-28)

**Note:** Version bump only for package @hocuspocus/server





## [3.2.1](https://github.com/ueberdosis/hocuspocus/compare/v3.2.0...v3.2.1) (2025-07-20)


### Bug Fixes

* add catch on message receiver when handling message ([#967](https://github.com/ueberdosis/hocuspocus/issues/967)) ([f9ceb26](https://github.com/ueberdosis/hocuspocus/commit/f9ceb2626674d173037be8f8bf25179719ddf977))





# [3.2.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.12...v3.2.0) (2025-07-12)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.12](https://github.com/ueberdosis/hocuspocus/compare/v3.1.11...v3.1.12) (2025-07-09)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.11](https://github.com/ueberdosis/hocuspocus/compare/v3.1.9...v3.1.11) (2025-07-08)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.10](https://github.com/ueberdosis/hocuspocus/compare/v3.1.9...v3.1.10) (2025-07-08)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.9](https://github.com/ueberdosis/hocuspocus/compare/v3.1.8...v3.1.9) (2025-07-01)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.8](https://github.com/ueberdosis/hocuspocus/compare/v3.1.7...v3.1.8) (2025-07-01)


### Features

* adds `document` to `beforeUnloadDocumentPayload` ([f7d1e64](https://github.com/ueberdosis/hocuspocus/commit/f7d1e646342746b9228fe1a8df8a80ee35e2aea5))
* beforeUnloadDocument: allow passing in Hocuspocus constructor ; allow preventing unload by throwing an error in beforeUnloadDocument ([63b298e](https://github.com/ueberdosis/hocuspocus/commit/63b298eddf23b8f472a066dc8274b22d790176ea))





## [3.1.7](https://github.com/ueberdosis/hocuspocus/compare/v3.1.6...v3.1.7) (2025-06-22)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.6](https://github.com/ueberdosis/hocuspocus/compare/v3.1.5...v3.1.6) (2025-06-20)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.5](https://github.com/ueberdosis/hocuspocus/compare/v3.1.4...v3.1.5) (2025-06-19)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.4](https://github.com/ueberdosis/hocuspocus/compare/v3.1.3...v3.1.4) (2025-06-17)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.3](https://github.com/ueberdosis/hocuspocus/compare/v3.1.2...v3.1.3) (2025-06-06)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.2](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1...v3.1.2) (2025-06-05)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.1](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1-rc.1...v3.1.1) (2025-05-10)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.1-rc.1](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1-rc.0...v3.1.1-rc.1) (2025-05-08)

**Note:** Version bump only for package @hocuspocus/server





## [3.1.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.0...v3.1.1-rc.0) (2025-04-30)

**Note:** Version bump only for package @hocuspocus/server





# [3.1.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.0-rc.0...v3.1.0) (2025-04-29)

**Note:** Version bump only for package @hocuspocus/server





# [3.1.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.8-rc.0...v3.1.0-rc.0) (2025-04-28)

**Note:** Version bump only for package @hocuspocus/server





## [3.0.8-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.7-rc.0...v3.0.8-rc.0) (2025-04-09)

**Note:** Version bump only for package @hocuspocus/server





## [3.0.7-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.6-rc.0...v3.0.7-rc.0) (2025-04-09)

**Note:** Version bump only for package @hocuspocus/server





## [3.0.6-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.5-rc.0...v3.0.6-rc.0) (2025-03-28)

**Note:** Version bump only for package @hocuspocus/server





## [3.0.5-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.4-rc.0...v3.0.5-rc.0) (2025-03-28)


### Features

* add beforeSync hook ([#919](https://github.com/ueberdosis/hocuspocus/issues/919)) ([a6a7bcd](https://github.com/ueberdosis/hocuspocus/commit/a6a7bcd0768378908ffb5d32096183280115631b))





## [3.0.4-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.3-rc.0...v3.0.4-rc.0) (2025-03-20)

**Note:** Version bump only for package @hocuspocus/server





## [3.0.3-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.2...v3.0.3-rc.0) (2025-03-20)


### Bug Fixes

* Memory leak in Direct Connection ([#895](https://github.com/ueberdosis/hocuspocus/issues/895)) ([70ab0e2](https://github.com/ueberdosis/hocuspocus/commit/70ab0e20e645e2ddd358847569b7e670622bbcc9)), closes [#2](https://github.com/ueberdosis/hocuspocus/issues/2)
* **server:** fast ws disconnect handling during conn setup ([#900](https://github.com/ueberdosis/hocuspocus/issues/900)) ([6817b53](https://github.com/ueberdosis/hocuspocus/commit/6817b535f63309c5ffbe59e3818c1ceb4749d0a7))





## [3.0.2-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.2...v3.0.2-rc.0) (2025-03-13)


### Bug Fixes

* Memory leak in Direct Connection ([#895](https://github.com/ueberdosis/hocuspocus/issues/895)) ([70ab0e2](https://github.com/ueberdosis/hocuspocus/commit/70ab0e20e645e2ddd358847569b7e670622bbcc9)), closes [#2](https://github.com/ueberdosis/hocuspocus/issues/2)
* **server:** fast ws disconnect handling during conn setup ([#900](https://github.com/ueberdosis/hocuspocus/issues/900)) ([6817b53](https://github.com/ueberdosis/hocuspocus/commit/6817b535f63309c5ffbe59e3818c1ceb4749d0a7))





## [3.0.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.2...v3.0.1-rc.0) (2025-03-13)


### Bug Fixes

* Memory leak in Direct Connection ([#895](https://github.com/ueberdosis/hocuspocus/issues/895)) ([70ab0e2](https://github.com/ueberdosis/hocuspocus/commit/70ab0e20e645e2ddd358847569b7e670622bbcc9)), closes [#2](https://github.com/ueberdosis/hocuspocus/issues/2)
* **server:** fast ws disconnect handling during conn setup ([#900](https://github.com/ueberdosis/hocuspocus/issues/900)) ([6817b53](https://github.com/ueberdosis/hocuspocus/commit/6817b535f63309c5ffbe59e3818c1ceb4749d0a7))





# [3.0.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.2...v3.0.0) (2025-03-13)


### Bug Fixes

* Memory leak in Direct Connection ([#895](https://github.com/ueberdosis/hocuspocus/issues/895)) ([70ab0e2](https://github.com/ueberdosis/hocuspocus/commit/70ab0e20e645e2ddd358847569b7e670622bbcc9)), closes [#2](https://github.com/ueberdosis/hocuspocus/issues/2)
* **server:** fast ws disconnect handling during conn setup ([#900](https://github.com/ueberdosis/hocuspocus/issues/900)) ([6817b53](https://github.com/ueberdosis/hocuspocus/commit/6817b535f63309c5ffbe59e3818c1ceb4749d0a7))





## [2.15.2](https://github.com/ueberdosis/hocuspocus/compare/v2.15.1...v2.15.2) (2025-02-03)

**Note:** Version bump only for package @hocuspocus/server





## [2.15.1](https://github.com/ueberdosis/hocuspocus/compare/v2.15.1-rc.0...v2.15.1) (2025-01-29)

**Note:** Version bump only for package @hocuspocus/server





## [2.15.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.0...v2.15.1-rc.0) (2025-01-29)


### Bug Fixes

* pass `WebSocket` instead of Connection to `applyAwarenessUpdate` ([#882](https://github.com/ueberdosis/hocuspocus/issues/882)) ([e359652](https://github.com/ueberdosis/hocuspocus/commit/e3596525072261a04f7c9e62888c06ea33f886dd))





# [2.15.0](https://github.com/ueberdosis/hocuspocus/compare/v2.14.0...v2.15.0) (2024-12-10)

**Note:** Version bump only for package @hocuspocus/server





# [2.14.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.7...v2.14.0) (2024-11-20)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.7](https://github.com/ueberdosis/hocuspocus/compare/v2.13.6...v2.13.7) (2024-10-08)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.6](https://github.com/ueberdosis/hocuspocus/compare/v2.13.5...v2.13.6) (2024-09-19)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.5](https://github.com/ueberdosis/hocuspocus/compare/v2.13.5-rc.0...v2.13.5) (2024-07-02)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.5-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.4-rc.0...v2.13.5-rc.0) (2024-07-01)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.4-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.2...v2.13.4-rc.0) (2024-07-01)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.3-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.2...v2.13.3-rc.0) (2024-07-01)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.2](https://github.com/ueberdosis/hocuspocus/compare/v2.13.1...v2.13.2) (2024-06-14)

**Note:** Version bump only for package @hocuspocus/server





## [2.13.1](https://github.com/ueberdosis/hocuspocus/compare/v2.13.0...v2.13.1) (2024-06-06)

**Note:** Version bump only for package @hocuspocus/server





# [2.13.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.3...v2.13.0) (2024-05-18)

**Note:** Version bump only for package @hocuspocus/server





## [2.12.3](https://github.com/ueberdosis/hocuspocus/compare/v2.12.2...v2.12.3) (2024-05-16)

**Note:** Version bump only for package @hocuspocus/server





## [2.12.2](https://github.com/ueberdosis/hocuspocus/compare/v2.12.2-rc.0...v2.12.2) (2024-04-25)

**Note:** Version bump only for package @hocuspocus/server





## [2.12.2-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.1-rc.0...v2.12.2-rc.0) (2024-03-29)

**Note:** Version bump only for package @hocuspocus/server





## [2.12.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.0-rc.0...v2.12.1-rc.0) (2024-03-29)

**Note:** Version bump only for package @hocuspocus/server





# [2.12.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.11.3...v2.12.0-rc.0) (2024-03-24)

**Note:** Version bump only for package @hocuspocus/server





## [2.11.3](https://github.com/ueberdosis/hocuspocus/compare/v2.11.2...v2.11.3) (2024-03-02)

**Note:** Version bump only for package @hocuspocus/server





## [2.11.2](https://github.com/ueberdosis/hocuspocus/compare/v2.11.1...v2.11.2) (2024-02-16)

**Note:** Version bump only for package @hocuspocus/server





## [2.11.1](https://github.com/ueberdosis/hocuspocus/compare/v2.11.0...v2.11.1) (2024-02-11)

**Note:** Version bump only for package @hocuspocus/server





# [2.11.0](https://github.com/ueberdosis/hocuspocus/compare/v2.10.0...v2.11.0) (2024-02-05)

**Note:** Version bump only for package @hocuspocus/server





# [2.10.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.2-rc.0...v2.10.0) (2024-01-31)

**Note:** Version bump only for package @hocuspocus/server





## [2.9.2-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.1-rc.0...v2.9.2-rc.0) (2024-01-22)

**Note:** Version bump only for package @hocuspocus/server





## [2.9.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.0...v2.9.1-rc.0) (2024-01-18)

**Note:** Version bump only for package @hocuspocus/server





# [2.9.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.0-rc.0...v2.9.0) (2024-01-05)

**Note:** Version bump only for package @hocuspocus/server





# [2.9.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.8.1...v2.9.0-rc.0) (2024-01-04)

**Note:** Version bump only for package @hocuspocus/server





## [2.8.1](https://github.com/ueberdosis/hocuspocus/compare/v2.8.0...v2.8.1) (2023-11-21)

**Note:** Version bump only for package @hocuspocus/server





# [2.8.0](https://github.com/ueberdosis/hocuspocus/compare/v2.7.1...v2.8.0) (2023-11-15)

**Note:** Version bump only for package @hocuspocus/server





## [2.7.1](https://github.com/ueberdosis/hocuspocus/compare/v2.7.0...v2.7.1) (2023-10-19)

**Note:** Version bump only for package @hocuspocus/server





# [2.7.0](https://github.com/ueberdosis/hocuspocus/compare/v2.6.1...v2.7.0) (2023-10-16)

**Note:** Version bump only for package @hocuspocus/server





## [2.6.1](https://github.com/ueberdosis/hocuspocus/compare/v2.6.0...v2.6.1) (2023-10-05)

**Note:** Version bump only for package @hocuspocus/server





# [2.6.0](https://github.com/ueberdosis/hocuspocus/compare/v2.5.0...v2.6.0) (2023-10-04)

**Note:** Version bump only for package @hocuspocus/server





# [2.5.0](https://github.com/ueberdosis/hocuspocus/compare/v2.5.0-rc.0...v2.5.0) (2023-09-06)

**Note:** Version bump only for package @hocuspocus/server





# [2.5.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0...v2.5.0-rc.0) (2023-08-24)

**Note:** Version bump only for package @hocuspocus/server





# [2.4.0](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0-rc.1...v2.4.0) (2023-08-17)

**Note:** Version bump only for package @hocuspocus/server





# [2.4.0-rc.1](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0-rc.0...v2.4.0-rc.1) (2023-08-12)

**Note:** Version bump only for package @hocuspocus/server





# [2.4.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.3.1...v2.4.0-rc.0) (2023-08-12)


### Bug Fixes

* check if ymap is empty ([#666](https://github.com/ueberdosis/hocuspocus/issues/666)) ([4450372](https://github.com/ueberdosis/hocuspocus/commit/4450372e7bff40693d32aa6b6c425dcfdb868ded))





## [2.3.1](https://github.com/ueberdosis/hocuspocus/compare/v2.3.0...v2.3.1) (2023-08-01)

**Note:** Version bump only for package @hocuspocus/server





# [2.3.0](https://github.com/ueberdosis/hocuspocus/compare/v2.2.3...v2.3.0) (2023-07-31)

**Note:** Version bump only for package @hocuspocus/server





## [2.2.3](https://github.com/ueberdosis/hocuspocus/compare/v2.2.2...v2.2.3) (2023-07-14)

**Note:** Version bump only for package @hocuspocus/server





## [2.2.2](https://github.com/ueberdosis/hocuspocus/compare/v2.2.1...v2.2.2) (2023-07-14)

**Note:** Version bump only for package @hocuspocus/server





## [2.2.1](https://github.com/ueberdosis/hocuspocus/compare/v2.2.0...v2.2.1) (2023-07-04)

**Note:** Version bump only for package @hocuspocus/server





# [2.2.0](https://github.com/ueberdosis/hocuspocus/compare/v2.1.0...v2.2.0) (2023-06-22)

**Note:** Version bump only for package @hocuspocus/server





# [2.1.0](https://github.com/ueberdosis/hocuspocus/compare/v2.0.6...v2.1.0) (2023-06-03)


### Bug Fixes

* export typings for recent typescript ([#602](https://github.com/ueberdosis/hocuspocus/issues/602)) ([551d27f](https://github.com/ueberdosis/hocuspocus/commit/551d27fa6de9c746c67bf0f1e3bb56167aebbca5)), closes [/github.com/artalar/reatom/issues/560#issuecomment-1528997739](https://github.com//github.com/artalar/reatom/issues/560/issues/issuecomment-1528997739)





## [2.0.6](https://github.com/ueberdosis/hocuspocus/compare/v2.0.5...v2.0.6) (2023-04-25)

**Note:** Version bump only for package @hocuspocus/server





## [2.0.5](https://github.com/ueberdosis/hocuspocus/compare/v2.0.4...v2.0.5) (2023-04-24)

**Note:** Version bump only for package @hocuspocus/server





## [2.0.4](https://github.com/ueberdosis/hocuspocus/compare/v2.0.3...v2.0.4) (2023-04-23)

**Note:** Version bump only for package @hocuspocus/server





## [2.0.3](https://github.com/ueberdosis/hocuspocus/compare/v2.0.2...v2.0.3) (2023-04-05)

**Note:** Version bump only for package @hocuspocus/server





## [2.0.2](https://github.com/ueberdosis/hocuspocus/compare/v2.0.1...v2.0.2) (2023-04-04)

**Note:** Version bump only for package @hocuspocus/server





## [2.0.1](https://github.com/ueberdosis/hocuspocus/compare/v2.0.0...v2.0.1) (2023-03-30)


### Bug Fixes

* connection.sendStateless error when connections more than one ([#556](https://github.com/ueberdosis/hocuspocus/issues/556)) ([9a9260f](https://github.com/ueberdosis/hocuspocus/commit/9a9260ffd5ee559bdc4f8ba4e7c1b1c12c2944d0))





# [2.0.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.3...v2.0.0) (2023-03-29)

**Note:** Version bump only for package @hocuspocus/server





# [2.0.0-beta.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.1...v2.0.0-beta.0) (2023-03-28)

**Note:** Version bump only for package @hocuspocus/server





# [2.0.0-alpha.1](https://github.com/ueberdosis/hocuspocus/compare/v2.0.0-alpha.0...v2.0.0-alpha.1) (2023-03-23)

**Note:** Version bump only for package @hocuspocus/server





# [2.0.0-alpha.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.0...v2.0.0-alpha.0) (2023-02-28)

**Note:** Version bump only for package @hocuspocus/server





# [1.1.0](https://github.com/ueberdosis/hocuspocus/compare/v1.0.2...v1.1.0) (2023-02-24)

**Note:** Version bump only for package @hocuspocus/server





## [1.0.2](https://github.com/ueberdosis/hocuspocus/compare/v1.0.1...v1.0.2) (2023-02-16)

**Note:** Version bump only for package @hocuspocus/server





## [1.0.1](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0...v1.0.1) (2023-01-30)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.7...v1.0.0) (2023-01-18)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-beta.7](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2023-01-11)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-beta.6](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2022-12-03)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-beta.5](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.3...v1.0.0-beta.5) (2022-11-25)


### Bug Fixes

* Crash when websocket receives out of bound characters pre-auth ([#444](https://github.com/ueberdosis/hocuspocus/issues/444)) ([73d8a48](https://github.com/ueberdosis/hocuspocus/commit/73d8a4812a4d9a851c97a52b6d62180a1fa4b56b))





# [1.0.0-beta.4](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2022-11-25)


### Bug Fixes

* Crash when websocket receives out of bound characters pre-auth ([#444](https://github.com/ueberdosis/hocuspocus/issues/444)) ([73d8a48](https://github.com/ueberdosis/hocuspocus/commit/73d8a4812a4d9a851c97a52b6d62180a1fa4b56b))





# [1.0.0-beta.3](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2022-11-03)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-beta.2](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2022-09-28)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-beta.111 (2022-09-28)


### Bug Fixes

* Empty sync message causes error in client MessageReceiver ([#174](https://github.com/ueberdosis/hocuspocus/issues/174)) ([f9dca69](https://github.com/ueberdosis/hocuspocus/commit/f9dca69eb96d1ede37a0709bd3b7735bf1ff57ba))
* fix hook promise chaining ([ee5052d](https://github.com/ueberdosis/hocuspocus/commit/ee5052d236ba0b400880dc7ca1c90cefdd372003))
* Potential onCreateDocument race condition ([#167](https://github.com/ueberdosis/hocuspocus/issues/167)) ([b3e3e4d](https://github.com/ueberdosis/hocuspocus/commit/b3e3e4dea74f9b833ccb0c6a6521f55c001411c1))
* Remove event listener once unused ([#220](https://github.com/ueberdosis/hocuspocus/issues/220)) ([0422196](https://github.com/ueberdosis/hocuspocus/commit/0422196f8a4e09af530c51419742b137b9ebbc69))
* typescript strings ([0dd5f12](https://github.com/ueberdosis/hocuspocus/commit/0dd5f1292616e426cdb4cc79e83ab8ced0895bfa))


### Features

* Add connectionsCount and documentsCount methods to server ([8bdbcd8](https://github.com/ueberdosis/hocuspocus/commit/8bdbcd86b1f18462f6636b75a4cbd97ebefdb227))
* add read only mode ([7b59d52](https://github.com/ueberdosis/hocuspocus/commit/7b59d522b966b51347db35ac6a4524211e44ae9c))
* add request headers and parameters to onCreateDocument ([47a8b95](https://github.com/ueberdosis/hocuspocus/commit/47a8b95baf8dd22ebd71c56565420179402cdaa4))
* Message Authentication ([#163](https://github.com/ueberdosis/hocuspocus/issues/163)) ([a1e68d5](https://github.com/ueberdosis/hocuspocus/commit/a1e68d5a272742bd17dd92522dfc908277343849))





# [1.0.0-alpha.107](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.106...@hocuspocus/server@1.0.0-alpha.107) (2022-09-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.106](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.105...@hocuspocus/server@1.0.0-alpha.106) (2022-09-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.105](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.104...@hocuspocus/server@1.0.0-alpha.105) (2022-08-28)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.104](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.103...@hocuspocus/server@1.0.0-alpha.104) (2022-07-13)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.103](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.102...@hocuspocus/server@1.0.0-alpha.103) (2022-06-08)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.102](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.101...@hocuspocus/server@1.0.0-alpha.102) (2022-04-05)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.101](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.100...@hocuspocus/server@1.0.0-alpha.101) (2022-04-05)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.100](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.99...@hocuspocus/server@1.0.0-alpha.100) (2022-03-30)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.99](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.98...@hocuspocus/server@1.0.0-alpha.99) (2022-03-21)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.98](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.97...@hocuspocus/server@1.0.0-alpha.98) (2022-03-21)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.97](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.96...@hocuspocus/server@1.0.0-alpha.97) (2022-03-11)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.96](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.95...@hocuspocus/server@1.0.0-alpha.96) (2022-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.95](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.94...@hocuspocus/server@1.0.0-alpha.95) (2022-02-24)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.94](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.93...@hocuspocus/server@1.0.0-alpha.94) (2022-02-24)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.93](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.92...@hocuspocus/server@1.0.0-alpha.93) (2022-02-22)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.92](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.91...@hocuspocus/server@1.0.0-alpha.92) (2022-02-18)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.91](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.90...@hocuspocus/server@1.0.0-alpha.91) (2022-01-12)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.90](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.89...@hocuspocus/server@1.0.0-alpha.90) (2021-12-13)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.89](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.88...@hocuspocus/server@1.0.0-alpha.89) (2021-12-09)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.88](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.87...@hocuspocus/server@1.0.0-alpha.88) (2021-12-08)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.87](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.86...@hocuspocus/server@1.0.0-alpha.87) (2021-12-07)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.86](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.85...@hocuspocus/server@1.0.0-alpha.86) (2021-12-03)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.85](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.84...@hocuspocus/server@1.0.0-alpha.85) (2021-12-01)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.84](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.83...@hocuspocus/server@1.0.0-alpha.84) (2021-12-01)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.83](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.82...@hocuspocus/server@1.0.0-alpha.83) (2021-11-30)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.82](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.81...@hocuspocus/server@1.0.0-alpha.82) (2021-11-30)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.81](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.80...@hocuspocus/server@1.0.0-alpha.81) (2021-11-26)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.80](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.79...@hocuspocus/server@1.0.0-alpha.80) (2021-11-24)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.79](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.78...@hocuspocus/server@1.0.0-alpha.79) (2021-11-22)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.78](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.77...@hocuspocus/server@1.0.0-alpha.78) (2021-11-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.77](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.76...@hocuspocus/server@1.0.0-alpha.77) (2021-11-05)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.76](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.75...@hocuspocus/server@1.0.0-alpha.76) (2021-10-31)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.75](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.74...@hocuspocus/server@1.0.0-alpha.75) (2021-10-15)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.74](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.73...@hocuspocus/server@1.0.0-alpha.74) (2021-10-08)


### Bug Fixes

* Remove event listener once unused ([#220](https://github.com/ueberdosis/hocuspocus/issues/220)) ([0422196](https://github.com/ueberdosis/hocuspocus/commit/0422196f8a4e09af530c51419742b137b9ebbc69))





# [1.0.0-alpha.73](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.71...@hocuspocus/server@1.0.0-alpha.73) (2021-09-23)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.71](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.70...@hocuspocus/server@1.0.0-alpha.71) (2021-09-23)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.70](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.69...@hocuspocus/server@1.0.0-alpha.70) (2021-09-17)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.69](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.68...@hocuspocus/server@1.0.0-alpha.69) (2021-09-14)


### Features

* Add connectionsCount and documentsCount methods to server ([8bdbcd8](https://github.com/ueberdosis/hocuspocus/commit/8bdbcd86b1f18462f6636b75a4cbd97ebefdb227))





# [1.0.0-alpha.68](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.67...@hocuspocus/server@1.0.0-alpha.68) (2021-09-01)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.67](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.66...@hocuspocus/server@1.0.0-alpha.67) (2021-09-01)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.66](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.65...@hocuspocus/server@1.0.0-alpha.66) (2021-08-31)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.65](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.64...@hocuspocus/server@1.0.0-alpha.65) (2021-08-29)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.64](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.63...@hocuspocus/server@1.0.0-alpha.64) (2021-08-27)


### Bug Fixes

* Empty sync message causes error in client MessageReceiver ([#174](https://github.com/ueberdosis/hocuspocus/issues/174)) ([f9dca69](https://github.com/ueberdosis/hocuspocus/commit/f9dca69eb96d1ede37a0709bd3b7735bf1ff57ba))
* Potential onCreateDocument race condition ([#167](https://github.com/ueberdosis/hocuspocus/issues/167)) ([b3e3e4d](https://github.com/ueberdosis/hocuspocus/commit/b3e3e4dea74f9b833ccb0c6a6521f55c001411c1))





# [1.0.0-alpha.63](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.62...@hocuspocus/server@1.0.0-alpha.63) (2021-08-19)


### Features

* Message Authentication ([#163](https://github.com/ueberdosis/hocuspocus/issues/163)) ([a1e68d5](https://github.com/ueberdosis/hocuspocus/commit/a1e68d5a272742bd17dd92522dfc908277343849))





# [1.0.0-alpha.62](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.61...@hocuspocus/server@1.0.0-alpha.62) (2021-08-19)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.61](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.60...@hocuspocus/server@1.0.0-alpha.61) (2021-08-13)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.60](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.59...@hocuspocus/server@1.0.0-alpha.60) (2021-07-13)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.59](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.58...@hocuspocus/server@1.0.0-alpha.59) (2021-06-22)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.58](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.57...@hocuspocus/server@1.0.0-alpha.58) (2021-06-11)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.57](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.56...@hocuspocus/server@1.0.0-alpha.57) (2021-06-09)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.56](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.55...@hocuspocus/server@1.0.0-alpha.56) (2021-06-09)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.55](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.54...@hocuspocus/server@1.0.0-alpha.55) (2021-06-08)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.54](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.53...@hocuspocus/server@1.0.0-alpha.54) (2021-06-08)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.53](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.52...@hocuspocus/server@1.0.0-alpha.53) (2021-05-15)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.52](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.51...@hocuspocus/server@1.0.0-alpha.52) (2021-04-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.51](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.50...@hocuspocus/server@1.0.0-alpha.51) (2021-04-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.50](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.49...@hocuspocus/server@1.0.0-alpha.50) (2021-04-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.49](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.48...@hocuspocus/server@1.0.0-alpha.49) (2021-04-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.48](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.47...@hocuspocus/server@1.0.0-alpha.48) (2021-04-20)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.47](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.46...@hocuspocus/server@1.0.0-alpha.47) (2021-04-15)


### Features

* add request headers and parameters to onCreateDocument ([47a8b95](https://github.com/ueberdosis/hocuspocus/commit/47a8b95baf8dd22ebd71c56565420179402cdaa4))





# [1.0.0-alpha.46](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.45...@hocuspocus/server@1.0.0-alpha.46) (2021-04-14)


### Features

* add read only mode ([7b59d52](https://github.com/ueberdosis/hocuspocus/commit/7b59d522b966b51347db35ac6a4524211e44ae9c))





# [1.0.0-alpha.45](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.44...@hocuspocus/server@1.0.0-alpha.45) (2021-04-12)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.44](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.43...@hocuspocus/server@1.0.0-alpha.44) (2021-04-08)


### Bug Fixes

* typescript strings ([0dd5f12](https://github.com/ueberdosis/hocuspocus/commit/0dd5f1292616e426cdb4cc79e83ab8ced0895bfa))





# [1.0.0-alpha.43](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.42...@hocuspocus/server@1.0.0-alpha.43) (2021-04-07)


### Bug Fixes

* fix hook promise chaining ([ee5052d](https://github.com/ueberdosis/hocuspocus/commit/ee5052d236ba0b400880dc7ca1c90cefdd372003))





# [1.0.0-alpha.42](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.41...@hocuspocus/server@1.0.0-alpha.42) (2021-04-06)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.41](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.40...@hocuspocus/server@1.0.0-alpha.41) (2021-04-06)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.40](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.39...@hocuspocus/server@1.0.0-alpha.40) (2021-03-29)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.39](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.38...@hocuspocus/server@1.0.0-alpha.39) (2021-03-29)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.38](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.37...@hocuspocus/server@1.0.0-alpha.38) (2021-03-25)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.37](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.36...@hocuspocus/server@1.0.0-alpha.37) (2021-03-18)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.36](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.35...@hocuspocus/server@1.0.0-alpha.36) (2021-03-15)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.35](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.34...@hocuspocus/server@1.0.0-alpha.35) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.34](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.33...@hocuspocus/server@1.0.0-alpha.34) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.33](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.32...@hocuspocus/server@1.0.0-alpha.33) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.32](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.31...@hocuspocus/server@1.0.0-alpha.32) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.31](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.30...@hocuspocus/server@1.0.0-alpha.31) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.30](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.29...@hocuspocus/server@1.0.0-alpha.30) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.29](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.28...@hocuspocus/server@1.0.0-alpha.29) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.28](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.27...@hocuspocus/server@1.0.0-alpha.28) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.27](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.26...@hocuspocus/server@1.0.0-alpha.27) (2021-03-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.26](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.25...@hocuspocus/server@1.0.0-alpha.26) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.25](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.24...@hocuspocus/server@1.0.0-alpha.25) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.24](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.23...@hocuspocus/server@1.0.0-alpha.24) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.23](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.22...@hocuspocus/server@1.0.0-alpha.23) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.22](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.21...@hocuspocus/server@1.0.0-alpha.22) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.21](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.20...@hocuspocus/server@1.0.0-alpha.21) (2021-03-04)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.20](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.19...@hocuspocus/server@1.0.0-alpha.20) (2021-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.19](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.18...@hocuspocus/server@1.0.0-alpha.19) (2021-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.18](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.17...@hocuspocus/server@1.0.0-alpha.18) (2021-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.17](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.16...@hocuspocus/server@1.0.0-alpha.17) (2021-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.16](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.15...@hocuspocus/server@1.0.0-alpha.16) (2021-03-02)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.15](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.14...@hocuspocus/server@1.0.0-alpha.15) (2021-02-22)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.14](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.13...@hocuspocus/server@1.0.0-alpha.14) (2021-02-18)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.13](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.12...@hocuspocus/server@1.0.0-alpha.13) (2021-02-15)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.12](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.11...@hocuspocus/server@1.0.0-alpha.12) (2021-02-15)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.11](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.10...@hocuspocus/server@1.0.0-alpha.11) (2021-02-01)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.10](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.9...@hocuspocus/server@1.0.0-alpha.10) (2021-01-26)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.9](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.8...@hocuspocus/server@1.0.0-alpha.9) (2021-01-21)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.8](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.7...@hocuspocus/server@1.0.0-alpha.8) (2021-01-11)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.7](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.6...@hocuspocus/server@1.0.0-alpha.7) (2021-01-11)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.6](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.5...@hocuspocus/server@1.0.0-alpha.6) (2020-12-10)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.5](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.3...@hocuspocus/server@1.0.0-alpha.5) (2020-12-09)

**Note:** Version bump only for package @hocuspocus/server





# [1.0.0-alpha.3](https://github.com/ueberdosis/hocuspocus/compare/@hocuspocus/server@1.0.0-alpha.1...@hocuspocus/server@1.0.0-alpha.3) (2020-12-09)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.1 (2020-12-09)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.1 (2020-12-09)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.1 (2020-12-09)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.1 (2020-12-02)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.2 (2020-12-02)

**Note:** Version bump only for package @hocuspocus/server





# 1.0.0-alpha.1 (2020-12-02)

**Note:** Version bump only for package @hocuspocus/server
