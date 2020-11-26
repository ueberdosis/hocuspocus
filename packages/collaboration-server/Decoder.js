import decoding from 'lib0/dist/decoding.cjs'

class Decoder {

  decoder

  constructor(message) {
    this.decoder = decoding.createDecoder(message)
  }

  int() {
    return decoding.readVarUint(this.decoder)
  }
}

export default Decoder
