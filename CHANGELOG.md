# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.2.5](https://github.com/ueberdosis/hocuspocus/compare/v3.2.4...v3.2.5) (2025-10-07)


### Bug Fixes

* delay adding document to instance until connection is about to be established ([#972](https://github.com/ueberdosis/hocuspocus/issues/972)) ([1e2917a](https://github.com/ueberdosis/hocuspocus/commit/1e2917aacb342c035645bb3c01af4910d699eaad))
* emit status event when status is updated to connected in onOpen, fixes [#1004](https://github.com/ueberdosis/hocuspocus/issues/1004) ([14829c1](https://github.com/ueberdosis/hocuspocus/commit/14829c1ee429359b3648c3021942fd581aa52f4d))
* **extension-redis:** avoid hard crashes of expected errors when acquiring a lock ([#983](https://github.com/ueberdosis/hocuspocus/issues/983)) ([38e58a4](https://github.com/ueberdosis/hocuspocus/commit/38e58a4d099cf0f5fba0f51cbd7be169de94b0bd))
* set max listeners to infinity to avoid warnings when using multiplexing ([21412aa](https://github.com/ueberdosis/hocuspocus/commit/21412aa3f4bc861fa4ece46c2e57d5a0a48be8af))


### Features

* remove uuid dependency and replace usages by crypto.randomUUID ([#1005](https://github.com/ueberdosis/hocuspocus/issues/1005)) ([393189f](https://github.com/ueberdosis/hocuspocus/commit/393189fe448c68cbd741642866be4b4b23546f17))





## [3.2.4](https://github.com/ueberdosis/hocuspocus/compare/v3.2.3...v3.2.4) (2025-09-30)

**Note:** Version bump only for package hocuspocus





## [3.2.3](https://github.com/ueberdosis/hocuspocus/compare/v3.2.2...v3.2.3) (2025-08-06)


### Bug Fixes

* fixes playground plug and play confg ([f9dff84](https://github.com/ueberdosis/hocuspocus/commit/f9dff843e5132fd858ce410e1774089e6b4c9692))
* unload document in catch block of storeDocumentHooks ([#955](https://github.com/ueberdosis/hocuspocus/issues/955)) ([1a3b5b8](https://github.com/ueberdosis/hocuspocus/commit/1a3b5b8b2057e11ea16068f17efadd5c93437276))


### Features

* adds configuration option autoConnect (default=true) which allows creating the provider without triggering a connection attempt (fixes [#938](https://github.com/ueberdosis/hocuspocus/issues/938)) ([adc315f](https://github.com/ueberdosis/hocuspocus/commit/adc315f0633f6fdad310384b5217fbe25e29108a))
* adds more error logging when a connection is closed due to an exception ([1c4090c](https://github.com/ueberdosis/hocuspocus/commit/1c4090cc464d724e74143296b6e05bde87f5f5bf))





## [3.2.2](https://github.com/ueberdosis/hocuspocus/compare/v3.2.1...v3.2.2) (2025-07-28)


### Bug Fixes

* **extension-redis:** redlock release race condition ([#958](https://github.com/ueberdosis/hocuspocus/issues/958)) ([5666a65](https://github.com/ueberdosis/hocuspocus/commit/5666a656f9bd2419fb8565c99a812698d1ff9dcf))





## [3.2.1](https://github.com/ueberdosis/hocuspocus/compare/v3.2.0...v3.2.1) (2025-07-20)


### Bug Fixes

* add catch on message receiver when handling message ([#967](https://github.com/ueberdosis/hocuspocus/issues/967)) ([f9ceb26](https://github.com/ueberdosis/hocuspocus/commit/f9ceb2626674d173037be8f8bf25179719ddf977))
* correct database link in redis.md ([#968](https://github.com/ueberdosis/hocuspocus/issues/968)) ([ec47b50](https://github.com/ueberdosis/hocuspocus/commit/ec47b505e8b5367ff59f7faa8588102ac4e4e58a))
* **extension-redis:** unsubscribe from pubsub ([#945](https://github.com/ueberdosis/hocuspocus/issues/945)) ([0812d48](https://github.com/ueberdosis/hocuspocus/commit/0812d4810c80ae6118c9376cced1d03c8f1f95dc))
* race condition when multiple providers connect to the same socket ; fixes [#964](https://github.com/ueberdosis/hocuspocus/issues/964) ([#966](https://github.com/ueberdosis/hocuspocus/issues/966)) ([4868bae](https://github.com/ueberdosis/hocuspocus/commit/4868bae54f7a82c5b0601edc325d42fd1f9420fd))





# [3.2.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.12...v3.2.0) (2025-07-12)


### Features

* adds hono example to backend playground ([bb2d390](https://github.com/ueberdosis/hocuspocus/commit/bb2d3902fc406e2964f422eda52b4fcc035f734e))
* playground ([ea54455](https://github.com/ueberdosis/hocuspocus/commit/ea544550b4b76f519a547008e3b77b76388996f2))





## [3.1.12](https://github.com/ueberdosis/hocuspocus/compare/v3.1.11...v3.1.12) (2025-07-09)

**Note:** Version bump only for package hocuspocus





## [3.1.11](https://github.com/ueberdosis/hocuspocus/compare/v3.1.9...v3.1.11) (2025-07-08)


### Features

* HocuspocusProviderWebsocket: adds handleTimeout callback that is called when the connection doesnt establish within the given timeout ([509e31b](https://github.com/ueberdosis/hocuspocus/commit/509e31bdcc23b625f8245c8c2d2ea320729dd8e7))





## [3.1.10](https://github.com/ueberdosis/hocuspocus/compare/v3.1.9...v3.1.10) (2025-07-08)

**Note:** Version bump only for package hocuspocus





## [3.1.9](https://github.com/ueberdosis/hocuspocus/compare/v3.1.8...v3.1.9) (2025-07-01)

**Note:** Version bump only for package hocuspocus





## [3.1.8](https://github.com/ueberdosis/hocuspocus/compare/v3.1.7...v3.1.8) (2025-07-01)


### Features

* adds `document` to `beforeUnloadDocumentPayload` ([f7d1e64](https://github.com/ueberdosis/hocuspocus/commit/f7d1e646342746b9228fe1a8df8a80ee35e2aea5))
* beforeUnloadDocument: allow passing in Hocuspocus constructor ; allow preventing unload by throwing an error in beforeUnloadDocument ([63b298e](https://github.com/ueberdosis/hocuspocus/commit/63b298eddf23b8f472a066dc8274b22d790176ea))





## [3.1.7](https://github.com/ueberdosis/hocuspocus/compare/v3.1.6...v3.1.7) (2025-06-22)

**Note:** Version bump only for package hocuspocus





## [3.1.6](https://github.com/ueberdosis/hocuspocus/compare/v3.1.5...v3.1.6) (2025-06-20)

**Note:** Version bump only for package hocuspocus





## [3.1.5](https://github.com/ueberdosis/hocuspocus/compare/v3.1.4...v3.1.5) (2025-06-19)

**Note:** Version bump only for package hocuspocus





## [3.1.4](https://github.com/ueberdosis/hocuspocus/compare/v3.1.3...v3.1.4) (2025-06-17)


### Bug Fixes

* playground: Cannot update a component (`CollaborationStatus`) while rendering a different component (`CollaborativeEditor`) ([9c6b87d](https://github.com/ueberdosis/hocuspocus/commit/9c6b87d882d2a1c00dca55cac1d71de2221a3a6d))
* playground: destroy instead of detach ([c8b60f8](https://github.com/ueberdosis/hocuspocus/commit/c8b60f84ea7b7df0d04a9aad71e92e8bba2c747c))
* playground: port 1234 ([62e45d4](https://github.com/ueberdosis/hocuspocus/commit/62e45d40fd7e044daa6b0eee0b96b0786d2c5a6b))
* playground: update styling of collaboration caret ([4a2506b](https://github.com/ueberdosis/hocuspocus/commit/4a2506ba0fe399280b7cd6cba31602c0660e7a36))


### Features

* playground: adds two editors for nicer testing ([b2332f2](https://github.com/ueberdosis/hocuspocus/commit/b2332f21c5369a6e980e19c1ef7842e8cf32b878))





## [3.1.3](https://github.com/ueberdosis/hocuspocus/compare/v3.1.2...v3.1.3) (2025-06-06)

**Note:** Version bump only for package hocuspocus





## [3.1.2](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1...v3.1.2) (2025-06-05)


### Bug Fixes

* fixes koa example in playground ([1a73d14](https://github.com/ueberdosis/hocuspocus/commit/1a73d14221a006f38d07063d7001ae8f1e14deaf))





## [3.1.1](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1-rc.1...v3.1.1) (2025-05-10)

**Note:** Version bump only for package hocuspocus





## [3.1.1-rc.1](https://github.com/ueberdosis/hocuspocus/compare/v3.1.1-rc.0...v3.1.1-rc.1) (2025-05-08)


### Bug Fixes

* fixes express/koa backend demo, fixes [#939](https://github.com/ueberdosis/hocuspocus/issues/939) ([ddec715](https://github.com/ueberdosis/hocuspocus/commit/ddec7153e7d40725d6551d7dfbc61aac1b2b042e))





## [3.1.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.0...v3.1.1-rc.0) (2025-04-30)

**Note:** Version bump only for package hocuspocus





# [3.1.0](https://github.com/ueberdosis/hocuspocus/compare/v3.1.0-rc.0...v3.1.0) (2025-04-29)

**Note:** Version bump only for package hocuspocus





# [3.1.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.8-rc.0...v3.1.0-rc.0) (2025-04-28)

**Note:** Version bump only for package hocuspocus





## [3.0.8-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.7-rc.0...v3.0.8-rc.0) (2025-04-09)

**Note:** Version bump only for package hocuspocus





## [3.0.7-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.6-rc.0...v3.0.7-rc.0) (2025-04-09)

**Note:** Version bump only for package hocuspocus





## [3.0.6-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.5-rc.0...v3.0.6-rc.0) (2025-03-28)

**Note:** Version bump only for package hocuspocus





## [3.0.5-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.4-rc.0...v3.0.5-rc.0) (2025-03-28)


### Features

* add beforeSync hook ([#919](https://github.com/ueberdosis/hocuspocus/issues/919)) ([a6a7bcd](https://github.com/ueberdosis/hocuspocus/commit/a6a7bcd0768378908ffb5d32096183280115631b))





## [3.0.4-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v3.0.3-rc.0...v3.0.4-rc.0) (2025-03-20)

**Note:** Version bump only for package hocuspocus





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

**Note:** Version bump only for package hocuspocus





## [2.15.1](https://github.com/ueberdosis/hocuspocus/compare/v2.15.1-rc.0...v2.15.1) (2025-01-29)

**Note:** Version bump only for package hocuspocus





## [2.15.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.15.0...v2.15.1-rc.0) (2025-01-29)


### Bug Fixes

* **comments:** fix error where deletedComments yArray does not exist ([#884](https://github.com/ueberdosis/hocuspocus/issues/884)) ([1e405ef](https://github.com/ueberdosis/hocuspocus/commit/1e405ef6da274c75c035131f7a2bf3eebad0fd4d))
* pass `WebSocket` instead of Connection to `applyAwarenessUpdate` ([#882](https://github.com/ueberdosis/hocuspocus/issues/882)) ([e359652](https://github.com/ueberdosis/hocuspocus/commit/e3596525072261a04f7c9e62888c06ea33f886dd))





# [2.15.0](https://github.com/ueberdosis/hocuspocus/compare/v2.14.0...v2.15.0) (2024-12-10)

**Note:** Version bump only for package hocuspocus





# [2.14.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.7...v2.14.0) (2024-11-20)


### Bug Fixes

* **provider:** allow deletion of first item ([3fe0b91](https://github.com/ueberdosis/hocuspocus/commit/3fe0b91cd5e13b53c6b2ffa9fdf6af3962c26b0b))
* **provider:** correct event handler binding for document updates and awareness ([e3c616c](https://github.com/ueberdosis/hocuspocus/commit/e3c616c2cd18a717cd3c36a093f4954a7cac39fc))
* **provider:** fix comment sorting ([e706537](https://github.com/ueberdosis/hocuspocus/commit/e7065378846260ed4ec59c3528a509b8239162c3))





## [2.13.7](https://github.com/ueberdosis/hocuspocus/compare/v2.13.6...v2.13.7) (2024-10-08)

**Note:** Version bump only for package hocuspocus





## [2.13.6](https://github.com/ueberdosis/hocuspocus/compare/v2.13.5...v2.13.6) (2024-09-19)

**Note:** Version bump only for package hocuspocus





## [2.13.5](https://github.com/ueberdosis/hocuspocus/compare/v2.13.5-rc.0...v2.13.5) (2024-07-02)

**Note:** Version bump only for package hocuspocus





## [2.13.5-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.4-rc.0...v2.13.5-rc.0) (2024-07-01)

**Note:** Version bump only for package hocuspocus





## [2.13.4-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.2...v2.13.4-rc.0) (2024-07-01)

**Note:** Version bump only for package hocuspocus





## [2.13.3-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.13.2...v2.13.3-rc.0) (2024-07-01)

**Note:** Version bump only for package hocuspocus





## [2.13.2](https://github.com/ueberdosis/hocuspocus/compare/v2.13.1...v2.13.2) (2024-06-14)

**Note:** Version bump only for package hocuspocus





## [2.13.1](https://github.com/ueberdosis/hocuspocus/compare/v2.13.0...v2.13.1) (2024-06-06)

**Note:** Version bump only for package hocuspocus





# [2.13.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.3...v2.13.0) (2024-05-18)

**Note:** Version bump only for package hocuspocus





## [2.12.3](https://github.com/ueberdosis/hocuspocus/compare/v2.12.2...v2.12.3) (2024-05-16)


### Bug Fixes

* improve global window checks to enable react native support ([#823](https://github.com/ueberdosis/hocuspocus/issues/823)) ([5dd53d5](https://github.com/ueberdosis/hocuspocus/commit/5dd53d554f5e54984a0743d25dfd16224a95a0d0))





## [2.12.2](https://github.com/ueberdosis/hocuspocus/compare/v2.12.2-rc.0...v2.12.2) (2024-04-25)

**Note:** Version bump only for package hocuspocus





## [2.12.2-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.1-rc.0...v2.12.2-rc.0) (2024-03-29)

**Note:** Version bump only for package hocuspocus





## [2.12.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.12.0-rc.0...v2.12.1-rc.0) (2024-03-29)


### Reverts

* Revert "websocket: enable following redirects (#806)" (#807) ([930a61c](https://github.com/ueberdosis/hocuspocus/commit/930a61c81e111cda2b692bf1d89b38bfce5d721d)), closes [#806](https://github.com/ueberdosis/hocuspocus/issues/806) [#807](https://github.com/ueberdosis/hocuspocus/issues/807)





# [2.12.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.11.3...v2.12.0-rc.0) (2024-03-24)

**Note:** Version bump only for package hocuspocus





## [2.11.3](https://github.com/ueberdosis/hocuspocus/compare/v2.11.2...v2.11.3) (2024-03-02)

**Note:** Version bump only for package hocuspocus





## [2.11.2](https://github.com/ueberdosis/hocuspocus/compare/v2.11.1...v2.11.2) (2024-02-16)


### Bug Fixes

* allow resolvedAt to be null on updateThread ([eac0bf9](https://github.com/ueberdosis/hocuspocus/commit/eac0bf994d37b072549fe446557efa0c4b2f1568))





## [2.11.1](https://github.com/ueberdosis/hocuspocus/compare/v2.11.0...v2.11.1) (2024-02-11)

**Note:** Version bump only for package hocuspocus





# [2.11.0](https://github.com/ueberdosis/hocuspocus/compare/v2.10.0...v2.11.0) (2024-02-05)

**Note:** Version bump only for package hocuspocus





# [2.10.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.2-rc.0...v2.10.0) (2024-01-31)

**Note:** Version bump only for package hocuspocus





## [2.9.2-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.1-rc.0...v2.9.2-rc.0) (2024-01-22)

**Note:** Version bump only for package hocuspocus





## [2.9.1-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.0...v2.9.1-rc.0) (2024-01-18)

**Note:** Version bump only for package hocuspocus





# [2.9.0](https://github.com/ueberdosis/hocuspocus/compare/v2.9.0-rc.0...v2.9.0) (2024-01-05)

**Note:** Version bump only for package hocuspocus





# [2.9.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.8.1...v2.9.0-rc.0) (2024-01-04)

**Note:** Version bump only for package hocuspocus





## [2.8.1](https://github.com/ueberdosis/hocuspocus/compare/v2.8.0...v2.8.1) (2023-11-21)

**Note:** Version bump only for package hocuspocus





# [2.8.0](https://github.com/ueberdosis/hocuspocus/compare/v2.7.1...v2.8.0) (2023-11-15)

**Note:** Version bump only for package hocuspocus





## [2.7.1](https://github.com/ueberdosis/hocuspocus/compare/v2.7.0...v2.7.1) (2023-10-19)

**Note:** Version bump only for package hocuspocus





# [2.7.0](https://github.com/ueberdosis/hocuspocus/compare/v2.6.1...v2.7.0) (2023-10-16)

**Note:** Version bump only for package hocuspocus





## [2.6.1](https://github.com/ueberdosis/hocuspocus/compare/v2.6.0...v2.6.1) (2023-10-05)


### Bug Fixes

* add `documentName` into broadcast message ([#713](https://github.com/ueberdosis/hocuspocus/issues/713)) ([8400928](https://github.com/ueberdosis/hocuspocus/commit/840092861fa2801c62d5c12d5574bfe24e266c3f))





# [2.6.0](https://github.com/ueberdosis/hocuspocus/compare/v2.5.0...v2.6.0) (2023-10-04)

**Note:** Version bump only for package hocuspocus





# [2.5.0](https://github.com/ueberdosis/hocuspocus/compare/v2.5.0-rc.0...v2.5.0) (2023-09-06)

**Note:** Version bump only for package hocuspocus





# [2.5.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0...v2.5.0-rc.0) (2023-08-24)

**Note:** Version bump only for package hocuspocus





# [2.4.0](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0-rc.1...v2.4.0) (2023-08-17)

**Note:** Version bump only for package hocuspocus





# [2.4.0-rc.1](https://github.com/ueberdosis/hocuspocus/compare/v2.4.0-rc.0...v2.4.0-rc.1) (2023-08-12)

**Note:** Version bump only for package hocuspocus





# [2.4.0-rc.0](https://github.com/ueberdosis/hocuspocus/compare/v2.3.1...v2.4.0-rc.0) (2023-08-12)


### Bug Fixes

* check if ymap is empty ([#666](https://github.com/ueberdosis/hocuspocus/issues/666)) ([4450372](https://github.com/ueberdosis/hocuspocus/commit/4450372e7bff40693d32aa6b6c425dcfdb868ded))





## [2.3.1](https://github.com/ueberdosis/hocuspocus/compare/v2.3.0...v2.3.1) (2023-08-01)

**Note:** Version bump only for package hocuspocus





# [2.3.0](https://github.com/ueberdosis/hocuspocus/compare/v2.2.3...v2.3.0) (2023-07-31)


### Bug Fixes

* hocuspocus provider auto connect and disconnect behavior ([#663](https://github.com/ueberdosis/hocuspocus/issues/663)) ([a035c09](https://github.com/ueberdosis/hocuspocus/commit/a035c09b0da4347b0de7cdbf4cfe7f59a14b76f3))
* remove awareness states on page unload instead of beforeunload ([#658](https://github.com/ueberdosis/hocuspocus/issues/658)) ([e1bd3f1](https://github.com/ueberdosis/hocuspocus/commit/e1bd3f1c9d9486382e1a856faac5118220a39087))





## [2.2.3](https://github.com/ueberdosis/hocuspocus/compare/v2.2.2...v2.2.3) (2023-07-14)

**Note:** Version bump only for package hocuspocus





## [2.2.2](https://github.com/ueberdosis/hocuspocus/compare/v2.2.1...v2.2.2) (2023-07-14)

**Note:** Version bump only for package hocuspocus





## [2.2.1](https://github.com/ueberdosis/hocuspocus/compare/v2.2.0...v2.2.1) (2023-07-04)

**Note:** Version bump only for package hocuspocus





# [2.2.0](https://github.com/ueberdosis/hocuspocus/compare/v2.1.0...v2.2.0) (2023-06-22)


### Bug Fixes

* docs/contributing.md ([#621](https://github.com/ueberdosis/hocuspocus/issues/621)) ([8dbe872](https://github.com/ueberdosis/hocuspocus/commit/8dbe872d2eb6a68361b4257728bf222ad60fa516))





# [2.1.0](https://github.com/ueberdosis/hocuspocus/compare/v2.0.6...v2.1.0) (2023-06-03)


### Bug Fixes

* export typings for recent typescript ([#602](https://github.com/ueberdosis/hocuspocus/issues/602)) ([551d27f](https://github.com/ueberdosis/hocuspocus/commit/551d27fa6de9c746c67bf0f1e3bb56167aebbca5)), closes [/github.com/artalar/reatom/issues/560#issuecomment-1528997739](https://github.com//github.com/artalar/reatom/issues/560/issues/issuecomment-1528997739)





## [2.0.6](https://github.com/ueberdosis/hocuspocus/compare/v2.0.5...v2.0.6) (2023-04-25)

**Note:** Version bump only for package hocuspocus





## [2.0.5](https://github.com/ueberdosis/hocuspocus/compare/v2.0.4...v2.0.5) (2023-04-24)

**Note:** Version bump only for package hocuspocus





## [2.0.4](https://github.com/ueberdosis/hocuspocus/compare/v2.0.3...v2.0.4) (2023-04-23)


### Bug Fixes

* Do not retry connection if data is too large ([#586](https://github.com/ueberdosis/hocuspocus/issues/586)) ([462a87f](https://github.com/ueberdosis/hocuspocus/commit/462a87f08bfdcaece4adb1ef8dca25ae42b3cb36))
* npm scripts for frontend playground ([#578](https://github.com/ueberdosis/hocuspocus/issues/578)) ([b4b61a0](https://github.com/ueberdosis/hocuspocus/commit/b4b61a0fc45524ed690d1b831c2d5ae67c6a5314))





## [2.0.3](https://github.com/ueberdosis/hocuspocus/compare/v2.0.2...v2.0.3) (2023-04-05)

**Note:** Version bump only for package hocuspocus





## [2.0.2](https://github.com/ueberdosis/hocuspocus/compare/v2.0.1...v2.0.2) (2023-04-04)

**Note:** Version bump only for package hocuspocus





## [2.0.1](https://github.com/ueberdosis/hocuspocus/compare/v2.0.0...v2.0.1) (2023-03-30)


### Bug Fixes

* connection.sendStateless error when connections more than one ([#556](https://github.com/ueberdosis/hocuspocus/issues/556)) ([9a9260f](https://github.com/ueberdosis/hocuspocus/commit/9a9260ffd5ee559bdc4f8ba4e7c1b1c12c2944d0))





# [2.0.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.3...v2.0.0) (2023-03-29)

**Note:** Version bump only for package hocuspocus





# [2.0.0-beta.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.1...v2.0.0-beta.0) (2023-03-28)

**Note:** Version bump only for package hocuspocus





# [2.0.0-alpha.1](https://github.com/ueberdosis/hocuspocus/compare/v2.0.0-alpha.0...v2.0.0-alpha.1) (2023-03-23)

**Note:** Version bump only for package hocuspocus





# [2.0.0-alpha.0](https://github.com/ueberdosis/hocuspocus/compare/v1.1.0...v2.0.0-alpha.0) (2023-02-28)

**Note:** Version bump only for package hocuspocus





# [1.1.0](https://github.com/ueberdosis/hocuspocus/compare/v1.0.2...v1.1.0) (2023-02-24)

**Note:** Version bump only for package hocuspocus





## [1.0.2](https://github.com/ueberdosis/hocuspocus/compare/v1.0.1...v1.0.2) (2023-02-16)


### Bug Fixes

* make `transformer` compatible with `@tiptap/core@^2.0.0-beta.210` ([#512](https://github.com/ueberdosis/hocuspocus/issues/512)) ([591103f](https://github.com/ueberdosis/hocuspocus/commit/591103fe15d3c3760b7e59e65785a34e1d736c16))





## [1.0.1](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0...v1.0.1) (2023-01-30)

**Note:** Version bump only for package hocuspocus





# [1.0.0](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.7...v1.0.0) (2023-01-18)

**Note:** Version bump only for package hocuspocus





# [1.0.0-beta.7](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2023-01-11)

**Note:** Version bump only for package hocuspocus





# [1.0.0-beta.6](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2022-12-03)

**Note:** Version bump only for package hocuspocus





# [1.0.0-beta.5](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.3...v1.0.0-beta.5) (2022-11-25)


### Bug Fixes

* Crash when websocket receives out of bound characters pre-auth ([#444](https://github.com/ueberdosis/hocuspocus/issues/444)) ([73d8a48](https://github.com/ueberdosis/hocuspocus/commit/73d8a4812a4d9a851c97a52b6d62180a1fa4b56b))





# [1.0.0-beta.4](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2022-11-25)


### Bug Fixes

* Crash when websocket receives out of bound characters pre-auth ([#444](https://github.com/ueberdosis/hocuspocus/issues/444)) ([73d8a48](https://github.com/ueberdosis/hocuspocus/commit/73d8a4812a4d9a851c97a52b6d62180a1fa4b56b))





# [1.0.0-beta.3](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2022-11-03)

**Note:** Version bump only for package hocuspocus





# [1.0.0-beta.2](https://github.com/ueberdosis/hocuspocus/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2022-09-28)

**Note:** Version bump only for package hocuspocus





# 1.0.0-beta.111 (2022-09-28)


### Bug Fixes

* Account for this.webSocket being null ([#235](https://github.com/ueberdosis/hocuspocus/issues/235)) ([b1476b6](https://github.com/ueberdosis/hocuspocus/commit/b1476b60f0eceb83d70c1ded2b3139e4f865a869))
* demos ([59b73de](https://github.com/ueberdosis/hocuspocus/commit/59b73de474f23b563995264f87a395e65ff73fee))
* Documentation fixes ([#138](https://github.com/ueberdosis/hocuspocus/issues/138)) ([8352196](https://github.com/ueberdosis/hocuspocus/commit/83521960dc47f063eb26a9a3162017da470ead54)), closes [#137](https://github.com/ueberdosis/hocuspocus/issues/137)
* Empty sync message causes error in client MessageReceiver ([#174](https://github.com/ueberdosis/hocuspocus/issues/174)) ([f9dca69](https://github.com/ueberdosis/hocuspocus/commit/f9dca69eb96d1ede37a0709bd3b7735bf1ff57ba))
* fix hook promise chaining ([ee5052d](https://github.com/ueberdosis/hocuspocus/commit/ee5052d236ba0b400880dc7ca1c90cefdd372003))
* fix playground build ([86bd9db](https://github.com/ueberdosis/hocuspocus/commit/86bd9db5f42370926b8b2027d679873b9c662b15))
* frontend demo packages are not installed on fresh clone ([7ead9e2](https://github.com/ueberdosis/hocuspocus/commit/7ead9e22d8e5227d0913f2d95a7578479e520b4c))
* og image domain ([5b78e3f](https://github.com/ueberdosis/hocuspocus/commit/5b78e3fa98bfc40dc109a1239297434a1af143d1))
* Potential onCreateDocument race condition ([#167](https://github.com/ueberdosis/hocuspocus/issues/167)) ([b3e3e4d](https://github.com/ueberdosis/hocuspocus/commit/b3e3e4dea74f9b833ccb0c6a6521f55c001411c1))
* Remote client awareness not immediately available ([37703f6](https://github.com/ueberdosis/hocuspocus/commit/37703f695f6bf3b0508c287294c5d26d2e888c37))
* Remove event listener once unused ([#220](https://github.com/ueberdosis/hocuspocus/issues/220)) ([0422196](https://github.com/ueberdosis/hocuspocus/commit/0422196f8a4e09af530c51419742b137b9ebbc69))
* typescript strings ([0dd5f12](https://github.com/ueberdosis/hocuspocus/commit/0dd5f1292616e426cdb4cc79e83ab8ced0895bfa))
* webhook docs ([f0faac2](https://github.com/ueberdosis/hocuspocus/commit/f0faac268dedabca8b0afa5b485bb02af8b5f399))


### Features

* add connect event to webhook extension ([d907354](https://github.com/ueberdosis/hocuspocus/commit/d907354561ca31130061b6393c240598d67259b1))
* Add connectionsCount and documentsCount methods to server ([8bdbcd8](https://github.com/ueberdosis/hocuspocus/commit/8bdbcd86b1f18462f6636b75a4cbd97ebefdb227))
* add create event to import documents from api ([240a032](https://github.com/ueberdosis/hocuspocus/commit/240a032a8d839144f9662c1ec947958823abfd45))
* add default schema to ProsemirrorTransformer and default extensions to TiptapTransformer, making both parameters in toYdoc optional ([e330ffd](https://github.com/ueberdosis/hocuspocus/commit/e330ffd81f8cbd98c1d57545d3ec9d51807f7db3))
* add disconnect event to webhook extension ([81679dd](https://github.com/ueberdosis/hocuspocus/commit/81679dd7828e96fc6e0a279880379eb16b28d788))
* add read only mode ([7b59d52](https://github.com/ueberdosis/hocuspocus/commit/7b59d522b966b51347db35ac6a4524211e44ae9c))
* add request headers and parameters to onCreateDocument ([47a8b95](https://github.com/ueberdosis/hocuspocus/commit/47a8b95baf8dd22ebd71c56565420179402cdaa4))
* add throttle extension ([b65de2a](https://github.com/ueberdosis/hocuspocus/commit/b65de2aa127c79fcad433d5e7353face7ad82d26))
* add transformations page to the guide ([81e0ddf](https://github.com/ueberdosis/hocuspocus/commit/81e0ddfefbfdf2095e477cca8d1eab7eac576c04))
* extension-redis should watch the ydoc for changes and notify other hocuspocus instances about it (via redis pub/sub) ([bacc535](https://github.com/ueberdosis/hocuspocus/commit/bacc53594550aa771765f8e123c9797a88071a20))
* improve wevhook docs ([3f774c4](https://github.com/ueberdosis/hocuspocus/commit/3f774c4aec6edea4428b6d3b12a24902f1abf383))
* Message Authentication ([#163](https://github.com/ueberdosis/hocuspocus/issues/163)) ([a1e68d5](https://github.com/ueberdosis/hocuspocus/commit/a1e68d5a272742bd17dd92522dfc908277343849))
