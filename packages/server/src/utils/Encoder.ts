import * as encoding from 'lib0/encoding.js'

class Encoder {

  encoder: encoding.Encoder

  /**
   * Constructor
   */
  constructor() {
    this.encoder = encoding.createEncoder()
  }

  /**
   * Write an integer
   */
  int(int: number): Encoder {
    encoding.writeVarUint(this.encoder, int)

    return this
  }

  /**
   * Write an array of unsigned 8bit integers
   */
  int8(int: Uint8Array): Encoder {
    encoding.writeVarUint8Array(this.encoder, int)

    return this
  }

  /**
   * Get the length
   */
  length(): number {
    return encoding.length(this.encoder)
  }

  /**
   * Encode to array of unsigned 8bit integers
   */
  encode(): Uint8Array {
    return encoding.toUint8Array(this.encoder)
  }
}

export default Encoder
