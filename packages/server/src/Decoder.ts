import decoding from 'lib0/dist/decoding.cjs'

class Decoder {

  decoder

  /**
   * Constructor
   * @param message
   */
  constructor(message) {
    this.decoder = decoding.createDecoder(message)
  }

  /**
   * Integer
   * @returns {*}
   */
  int() {
    return decoding.readVarUint(this.decoder)
  }

  /**
   * Integer 8bit
   * @returns {*}
   */
  int8() {
    return decoding.readVarUint8Array(this.decoder)
  }
}

export default Decoder
