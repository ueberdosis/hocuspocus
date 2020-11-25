# tiptap websocket server

`$ yarn start`

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
