/**
 * Abstraction to hold all endian-specific functions. See {@link LittleEndian} and {@link BigEndian}
 * implementations.
 */
interface Endian {

  /**
   * Translate a 16 bit value into a Uint8Array.
   *
   * @param word only 16 unsigned integer bits are used.
   */
  wordToByteArray(word: number): Uint8Array;

  wordToTwoBytes(word: number): [number, number];

  /**
   * Two bytes in stream order are returned as a 16 bit word.
   *
   * @param bytes
   */
  twoBytesToWord(bytes: [number, number]): number;

  /**
   *
   * @param array
   * @param word
   */
  pushWordBytes(array: number[], word: number): void;
}

class LittleEndian implements Endian {

  wordToByteArray = (word: number) => new Uint8Array([word & 0xff, (word & 0xff00) >> 8]);

  twoBytesToWord = (bytes: [number, number]): number => (bytes[1] << 8) + bytes[0];

  wordToTwoBytes = (word: number): [number, number] => [word & 0xff, (word & 0xff00) >> 8];

  pushWordBytes(array: number[], word: number) {
    const w = this.wordToTwoBytes(word);
    array.push(w[0], w[1]);
  }
}

class BigEndian implements Endian {

  twoBytesToWord = (bytes: [number, number]): number => (bytes[0] << 8) + bytes[1];

  wordToByteArray = (word: number): Uint8Array => Uint8Array.from([(word & 0xff00) >> 8, word & 0xff]);

  wordToTwoBytes = (word: number): [number, number] => [(word & 0xff00) >> 8, word & 0xff];

  pushWordBytes(array: number[], word: number) {
    const w = this.wordToTwoBytes(word);
    array.push(w[0], w[1]);
  }
}

const LE: LittleEndian = new LittleEndian();
const BE: BigEndian = new BigEndian();

export {BE, LE, BigEndian, LittleEndian, type Endian};
