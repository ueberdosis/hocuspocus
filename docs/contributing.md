---
tableOfContents: true
---

# Contributing

## Introduction

Hocuspocus would be nothing without its lively community. Contributions have always been and will always be welcome. Here is a little bit you should know, before you send your contribution:

## Welcome examples

- Failing regression tests as bug reports
- Documentation improvements, e. g. fix a typo, add a section
- New features for existing extensions, e. g. a new configureable option
- Well explained, non-breaking changes to the core

## Won’t merge

- New extensions, which we then need to support and maintain

## Submit ideas

Make sure to open an issue and outline your idea first. We’ll get back to you quickly and let you know if there is a chance we can merge your contribution.

## Set up the development environment

It’s not too hard to tinker around with the official repository. You’ll need [Git](https://github.com/git-guides/install-git), [Node and NPM](https://nodejs.org/en/download/) installed. Here is what you need to do then:

1. Copy the code to your local machine: `$ git clone git@github.com:ueberdosis/hocuspocus.git`
3. Install dependencies: `$ npm install`
4. Build packages `$ npm build:packages`
3. Start the development environment: `$ npm run start`
4. Open http://localhost:3000 in your favorite browser.
5. Start playing around!

Compile and watch for changes:

```sh
npm run build:watch
```

## How to include local hocuspocus packages in your development project

If you want to include a local hocuspocus package in your project, you'll need to follow the following steps. I have tried using `npm link`, but havent managed to make it work reliably because of duplicated yjs imports. The following is the only way I made it work:

Execute the following command in this (hocupsocus) repo to compile the sources:

`$ rollup -c -w`

Then ..

```bash
$ cd other_project # execute the following commands within the other project that should include local
 # hocuspocus dependencies. Replace `provider` by the package that you want to replace.
 # Replace HOCUSPOCUS_LOCAL_REPO_PATH by the path of "this" repo.
$ rm -Rf node_modules/yjs node_modules/@hocuspocus/provider
$ ln -s HOCUSPOCUS_LOCAL_REPO_PATH/packages/provider node_modules/@hocuspocus/provider
$ ln -s HOCUSPOCUS_LOCAL_REPO_PATH/node_modules/yjs ./node_modules/yjs
```

Still doesnt work? -> rm -Rf node_modules && npm install ; then try again


## Our code style

There is an eslint config that ensures a consistent code style. To check for errors, run `$ npm run lint`. That’ll be checked when you send a pull request, too. Make sure it’s passing, before sending a pull request.

## Testing for errors
Your pull request will automatically execute all our existing tests. Make sure they all pass before sending a pull request. Your pull request will automatically execute all tests via the GitHub Workflow.

- Start a redis server: `$ docker run -d --name hocuspocus-redis -p 6379:6379 redis:7`
- Run all tests locally: `$ npm run test`
- Run all tests of a single package: `$ npm run test -- tests/PACKAGE_NAME`


## Further questions

Any further questions? Create a new issue or discussion in the repository. We’ll get back to you.
