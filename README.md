# tiptap websocket server

## Production

`$ yarn install`
`$ yarn start`

## Development

`$ yarn install`
`$ yarn start:development`

## Tasks
- [ ] Separate demo code from package (in different folders, e. g. src/ and demo/)
- [ ] Publish package on GitHub registry
- [ ] Write README
- [ ] Create new repository for the tiptap documentation example server (e. g. `tiptap-collaboration-server-demo`)
- [ ] Add Docker Setup
- [ ] Deploy demo to Servivum
- [ ] Add eslint
- [ ] Write tests?
- [ ] Refactor to TypeScript?
- [ ] Test with a dummy Laravel application
- [ ] Publish on npm
- [ ] Move documentation to tiptap
- [ ] Add Redis support

## HTTP Callback
CALLBACK_URL: Callback server URL
CALLBACK_DEBOUNCE_WAIT: Debounce time between callbacks (in ms). Defaults to 2000 ms
CALLBACK_DEBOUNCE_MAXWAIT: Maximum time to wait before callback. Defaults to 10 seconds
CALLBACK_TIMEOUT: Timeout for the HTTP call. Defaults to 5 seconds
CALLBACK_OBJECTS: JSON of shared objects to get data ('{"SHARED_OBJECT_NAME":"SHARED_OBJECT_TYPE}')

## Persistence
YPERSISTENCE: Persist document updates in a LevelDB database.

## Scaling
REDIS
