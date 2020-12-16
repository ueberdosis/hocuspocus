# Documents

## toc

## Introduction
The document name is `'example-document'` in all examples here, but it could be any string.

## Real-world examples
In a real-world app you would probably add the name of your entity, an unique ID of the entity and in some cases even the field (if you have multiple fields that you want to make collaborative). Here is how that could look like for a CMS:

```js
const documentName = 'page.140.content'
```

In the backend, you can split the string to know the user is typing on a `page` with the ID `140` in the `content` field to manage authorization and such accordingly.

New documents are created on the fly, no need to tell the backend about them, besides passing a string to the provider.

## Parse names
TODO
