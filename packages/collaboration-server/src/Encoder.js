import encoding from 'lib0/dist/encoding.cjs'

class Encoder {

  encoder

  constructor() {
    this.encoder = encoding.createEncoder()
  }

  int(int) {
    encoding.writeVarUint(this.encoder, int)

    return this
  }

  int8(int) {
    encoding.writeVarUint8Array(this.encoder, int)

    return this
  }

  encode() {
    return encoding.toUint8Array(this.encoder)
  }
}

export default Encoder
