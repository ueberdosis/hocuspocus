---
tableOfContents: true
---

# Introducing hooks

## Introduction

hocuspocus offers hooks to extend it's functionality and integrate it into existing applications. Hooks are configured as simple methods the same way as [other configuration options](/guide/configuration) are.

Hooks accept a hook payload as first argument. The payload is an object that contains data you can use and manipulate, allowing you to built complex things on top of this simple mechanic.

Hooks are required to return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), the easiest way to do that is to mark the function as `async`. (Node.js version must be greater or equal to 14)

## Lifecycle

Hooks will be called on different stages of the Hocuspocus lifecycle. For example the `onListen` hook will be called when you call the `listen()` method on the server instance.

Some hooks allow you not only to react to those events but also to intercept them. For example the `onConnect` hook will be fired when a new connection is made to underlying websocket server. By rejecting the Promise in your hook (or throwing an empty exception if using async) you can terminate the connection and stop the chain.

## The hook chain

The chain? Well, extensions use hooks as well to add additional functionality to Hocuspocus. They will be called after another in the order of their registration with your configuration as the last part of the chain.

If the Promise in a hook is rejected it will not be called for the following extensions or your configuration. It's like a stack of middlewares a request has to go through. Keep that in mind when working with hooks.
