
class Server {
  configuration = {
    port: 8080,
  }

  create(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration
    }

    return this
  }

  listen() {
    this.log(`Listening on :${this.configuration.port}`)
  }

  log(message) {
    console.log('\x1b[32m%s\x1b[0m', '🚀 [TiptapCollaborationServer]', message)
  }
}

export const TiptapCollaborationServer = new Server
