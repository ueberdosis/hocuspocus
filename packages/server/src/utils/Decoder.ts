import { decoding } from 'lib0'

class Decoder {

  decoder: decoding.Decoder

  /**
   * Constructor
   */
  constructor(message: Uint8Array) {
    this.decoder = decoding.createDecoder(message)
  }

  /**
   * Read an integer
   */
  int(): number {
    return decoding.readVarUint(this.decoder)
  }

  /**
   * Read an array of unsigned 8bit integers
   */
  int8(): Uint8Array {
    return decoding.readVarUint8Array(this.decoder)
  }
}

export default Decoder
