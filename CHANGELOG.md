# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
