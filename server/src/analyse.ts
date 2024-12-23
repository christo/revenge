// script for analysing prg files

import fs from "fs";
import path from "path";
import os from "os";


type BytePair = [number, number];

const incM = <K>(map: Map<K, number>, key: K) => {
  // @ts-ignore missing key handled by if
  map.set(key, map.has(key) ? map.get(key) + 1 : 1);
};

/**
 * Represents frequencies of adjacent byte pairs as well as first bytes and last bytes in the file.
 * Binary formats are expected to exhibit frequency distribution clustering, as per cryptanalysis.
 */
interface Markov {
  incStart: (i: number) => void;
  incStop: (i: number) => void;
  incPair: (i: BytePair) => void;

  /** Implementation-specific file format. */
  write(file: string): Promise<void>;

  readPairs(file: string): Promise<string>;
}

abstract class BaseMarkov implements Markov {
  abstract incStart: (i: number) => void;
  abstract incStop: (i: number) => void;
  abstract incPair: (i: BytePair) => void;
  abstract write: (file: string) => Promise<void>;

  async readPairs(file: string): Promise<string> {
    let bufLen = 0;
    try {
      let prev: number = -1;
      const buf = await fs.promises.readFile(file);
      for (const [i, b] of buf.entries()) {
        const val = 0xff & b;
        if (i === 0) {
          this.incStart(val);
        } else {
          let pair: BytePair = [prev, val];
          try {
            this.incPair(pair);
          } catch (err) {
            console.error(`pair error for ${pair}`);
            console.error(err);

          }
        }
        prev = val;
      }
      this.incStop(prev);
      bufLen = buf.length;
    } catch (err) {
      console.error(`error reading ${file} because: ` + err);
    }
    return file + " : " + bufLen;
  }

}

/** More efficient storage of sparse frequency distributions. */
class MapMarkov extends BaseMarkov implements Markov {
  private readonly starts: Map<number, number>;
  private readonly stops: Map<number, number>;
  private readonly pairs: Map<BytePair, number>;

  constructor() {
    super();
    this.starts = new Map<number, number>();
    this.stops = new Map<number, number>();
    this.pairs = new Map<BytePair, number>();
  }

  incStart = (startByte: number) => incM<number>(this.starts, startByte);
  incStop = (stopByte: number) => incM<number>(this.stops, stopByte);
  incPair = (pair: BytePair) => incM<BytePair>(this.pairs, pair);

  /** writes this as json */
  write = async (file: string): Promise<void> => {
    const obj = {
      starts: this.starts,
      stops: this.stops,
      pairs: this.pairs
    };
    const mapToJson = (key: any, value: any) => {
      if (value instanceof Map) {
        return {
          dataType: 'Map',
          value: Array.from(value.entries()),
        };
      } else {
        return value;
      }
    }
    await fs.promises.writeFile(file, JSON.stringify(obj, mapToJson));
  };

}

// noinspection JSUnusedLocalSymbols
/**
 * Implementation using big, mostly empty arrays
 */
class ArrayMarkov extends BaseMarkov implements Markov {

  starts: number[];
  stops: number[];
  pairs: number[];

  constructor() {
    super();
    this.starts = new Array<number>(256).fill(0);
    this.stops = new Array<number>(256).fill(0);
    this.pairs = new Array<number>(256 * 256).fill(0);
  }

  incStart = (val: number) => {
    this.starts[val] = this.starts[val] + 1
  };

  incStop = (val: number) => {
    this.stops[val] = this.stops[val] + 1
  };

  incPair = (pair: BytePair) => {
    const index = pair[0] << 8 + pair[1];
    this.pairs[index] = this.pairs[index] + 1;
  };

  /**
   * writes this as csv: first row is start counts, last row is stop counts,
   * middle 256 rows are counts of pairs from row num -> col num
   * (zero-based, ignoring starts and stops rows)
   */
  write = async (csv: string) => {
    await fs.promises.writeFile(csv, ''); // start from empty
    const addRow = (vals: number[]) => fs.promises.appendFile(csv, vals.join() + '\n', "utf-8");
    try {
      await addRow(this.starts);
      for (let i = 0; i <= 0xffff; i += 256) {
        await addRow(this.pairs.slice(i, i + 256));
      }
      await addRow(this.stops);
    } catch (err) {
      console.error(err);
    }
  };
}

async function* walk(dir: string, m: Markov): any {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield * walk(entry, m);
    } else if (d.isFile() && d.name.toLowerCase().endsWith('.prg')) {
      yield m.readPairs(entry);
    }
  }
}

async function main(markov: Markov, root: string, file: string) {
  let startTime = Date.now();
  for await (const p of walk(root, markov)) {
    console.log(p);
  }
  await markov.write(file);
  console.log(`run time: ${(Date.now() - startTime) / 1000}s for ${root}`);
}


const CBM = path.join(os.homedir(), "/stuff/retro/cbm/");
const C64 = path.join(os.homedir(), "/stuff/retro/cbm/c64/");
const RULEZ = path.join(os.homedir(), "/stuff/retro/cbm/c64/rulez-demos-cd/");
const SMALL = path.join(os.homedir(), "/stuff/retro/cbm/c64/new-games/");
const VIC20 = path.join(os.homedir(), "/stuff/retro/cbm/vic20/");
const SINGLE = path.join(os.homedir(), "/stuff/retro/cbm/c64/new-games/RobotsRumble/");

// main(new ArrayMarkov(), CBM, 'byte-freq.csv').then(_ => console.log("done"));
main(new MapMarkov(), RULEZ, 'byte-freq.json').then(_ => console.log("done"));

export {main};
