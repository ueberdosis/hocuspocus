---
tableOfContents: true
---

# Command-line interface

## Introduction
Sometimes, you just want to spin up a local Hocuspocus instance really fast. Maybe just to give it a try, or to test your webhooks locally. Our CLI brings Hocuspocus to your command line in seconds.

## Execute once

```bash
npx @hocuspocus/cli
npx @hocuspocus/cli --port 8080
npx @hocuspocus/cli --webhook http://localhost/webhooks/hocuspocus
npx @hocuspocus/cli --sqlite
```

## Global installation

```bash
npm install -g @hocuspocus/cli
hocuspocus --port 8080
hocuspocus --webhook http://localhost/webhooks/hocuspocus
hocuspocus --sqlite
```

```bash
yarn global add @hocuspocus/cli
hocuspocus --port 8080
hocuspocus --webhook http://localhost/webhooks/hocuspocus
hocuspocus --sqlite
```

## Per-project installation

```bash
npm install @hocuspocus/cli
./node_modules/.bin/@hocuspocus/cli
./node_modules/.bin/@hocuspocus/cli --port 8080
./node_modules/.bin/@hocuspocus/cli --webhook http://localhost/webhooks/hocuspocus
./node_modules/.bin/@hocuspocus/cli --sqlite
```

```bash
yarn add @hocuspocus/cli
./node_modules/.bin/@hocuspocus/cli
./node_modules/.bin/@hocuspocus/cli --port 8080
./node_modules/.bin/@hocuspocus/cli --webhook http://localhost/webhooks/hocuspocus
./node_modules/.bin/@hocuspocus/cli --sqlite
```
