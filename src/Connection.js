class Connection {

  connection
  request

  constructor(connection, request) {
    connection.binaryType = 'arraybuffer'



    this.connection = connection
    this.request = request
  }
}

export default Connection
