import { decoding } from 'lib0'

class Decoder {

  decoder: decoding.Decoder

  /**
   * Constructor
   * @param message
   */
  constructor(message: Uint8Array) {
    this.decoder = decoding.createDecoder(message)
  }

  /**
   * Integer
   * @returns {*}
   */
  int(): number {
    return decoding.readVarUint(this.decoder)
  }

  /**
   * Integer 8bit
   * @returns {*}
   */
  int8(): Uint8Array {
    return decoding.readVarUint8Array(this.decoder)
  }
}

export default Decoder
