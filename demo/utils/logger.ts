import {
  Extension, onChangePayload, onConnectPayload, onCreateDocumentPayload, onDisconnectPayload,
} from '@hocuspocus/server'

export class Logger implements Extension {
  onCreateDocument(data: onCreateDocumentPayload): void {
    console.log(`Created document "${data.documentName}"…`)
  }

  onChange(data: onChangePayload): void {
    console.log(`Document "${data.documentName}" changed…`)
  }

  onConnect(data: onConnectPayload, resolve: Function, reject: Function): void {
    console.log(`New connection to "${data.documentName}"…`)
  }

  onDisconnect(data: onDisconnectPayload): void {
    console.log(`Connection to "${data.documentName}" closed…`)
  }
}
