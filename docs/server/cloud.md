# Tiptap Collab

Tiptap Collab is our hosted solution of Hocuspocus for those who don't want to maintain their own deployment.

:::warning Pro Feature
To get started, you need a Tiptap Pro account ([sign up here](https://tiptap.dev/pro)).

If you already have one, just click [here](https://tiptap.dev/pro) and follow the Tiptap Collab banner.
:::

Note that you need `@hocuspocus/provider` >= [v1.1.3](https://github.com/ueberdosis/hocuspocus/releases/tag/v1.1.3)

### Upgrade from self-hosted deployment

If you are upgrading from a self-hosted deployment, on the frontend you just need to replace `HocuspocusProvider` with the new `TiptapCollabProvider`. The API is the same, it's just a wrapper that handles hostnames / auth.

```typescript
import { TiptapCollabProvider } from '@hocuspocus/provider'

const provider = new TiptapCollabProvider({
  appId: 'your_app_id', // get this at collab.tiptap.dev
  name: 'your_document_name', // e.g. a uuid uuidv4();
  token: 'your_JWT', // see "Authentication" below
});
```

##### Authentication

Authentication is done using JWT. You can see your secret in the admin interface and use it to generate tokens for your clients. Note that we are not supporting per-document authentication yet, so we recommend choosing a non-guessable documentName (e.g. using uuidv4() or any random string)

In Node.js, you can generate a JWT like this:

```typescript
import jsonwebtoken from 'jsonwebtoken'

const data = {
  ... // add whatever you want (e.g. a user ID). Currently this data is not used, but we're considering adding this to support per-document authentication.
}

const jwt = jsonwebtoken.sign(data, 'your_secret')
// this JWT should be sent in the `token` field of the provider. Never expose 'your_secret' to a frontend!
```

#### Getting the JSON document

If you want to access the JSON representation (we're currently exporting the `default` fragment of the YDoc), you can add a webhook in the admin interface. We are calling it when storing to our database, so it's debounced by 2 seconds (max 10 seconds).

All requests contain a header `X-Hocuspocus-Signature-256` which signs the entire message using 'your_secret' (find it in the settings). The payload looks like this:

```json
{
  "name": '', // name of your app
  "time": // current time as ISOString (new Date()).toISOString())
  "data": {}, // ydoc.getArray('default').toJSON()
  "clientsCount": 100 // number of currently connected clients
}
```

### Need anything else?

Contact us on [Discord](https://tiptap.dev/discord) or send an email to [humans@tiptap.dev](mailto:humans@tiptap.dev).
