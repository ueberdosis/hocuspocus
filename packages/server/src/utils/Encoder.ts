import { encoding } from 'lib0'

class Encoder {

  encoder: encoding.Encoder

  /**
   * Constructor
   */
  constructor() {
    this.encoder = encoding.createEncoder()
  }

  /**
   * Integer
   * @param int
   * @returns {Encoder}
   */
  int(int: number): Encoder {
    encoding.writeVarUint(this.encoder, int)

    return this
  }

  /**
   * 8bit integer
   * @param int
   * @returns {Encoder}
   */
  int8(int: Uint8Array): Encoder {
    encoding.writeVarUint8Array(this.encoder, int)

    return this
  }

  /**
   * Length
   * @returns {int}
   */
  length(): number {
    return encoding.length(this.encoder)
  }

  /**
   * Encode to 8bit integer
   * @returns {*}
   */
  encode(): Uint8Array {
    return encoding.toUint8Array(this.encoder)
  }
}

export default Encoder
