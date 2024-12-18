/*
 * Follows machine code execution flows of directed acyclic graphs in memory to build set of possible next instructions,
 * with some caveats such as no self-modified code or indexed addressing in jump/branch operands (where applicable).
 *
 * Not initially intended to help with self-mod code. The most general form of that is famously intractable but case
 * analysis may help to contain certain examples. Two paths forward on that may be 1. monte-carlo simulation using full
 * emulator; 2. user-interactive designation for specific code stored as special-cases in a database, also self-mod
 * idioms may be recognised this same way across different code bases.
 */

import {Endian, Memory} from "./core";
import {Disassembler} from "./asm/Disassembler";
import {Thread} from "./Thread.ts";

/**
 * Analyser that approximates code execution to some degree. Static analysis ignores register and memory contents,
 * following all theoretically reachable code paths from the entry point.
 *
 */
class Tracer {
  threads: Thread[] = [];

  // TODO: identify self-mod code and refuse to trace it
  // TODO: identify code vs data. Data may be written to without causing self-mod.
  // TODO: keep track of locations written to (data)
  // TODO: keep track of locations visited (code)
  // TODO: a history of executed locations and their stacks(!), when revisiting with the same stack, kill that thread
  //          maybe we can only afford to do this for empty stacks? maybe certain small stacks of say 1 or 2 size?
  //          maybe we can collapse sequences of step instructions?, halts, unconditional jumps, conditional
  //          jumps (forks) and subroutine jumps (deferred steps).
  // TODO: a list of contiguous memory regions which can contain executable code
  // FUTURE: would also be nice to know if a memory location is writeable (later)

  /**
   * Create a Tracer with a single Memory and single thread of execution at startLocation.
   *
   * @param disasm used to interpret memory as instructions
   * @param pc program counter; absolute address in the memory of next instruction to execute.
   * @param memory the Memory
   */
  constructor(disasm: Disassembler, pc: number, memory: Memory<Endian>) {
    if (Math.round(pc) !== pc) {
      throw Error(`startLocation must be integral`);
    } else if (pc < 0 || memory.getLength() <= pc) {
      throw Error(`startLocation ${pc} not inside memory of size ${memory.getLength()}`);
    } else if (!memory.executable()) {
      throw Error("memory not marked for execution");
    }
    this.threads.push(new Thread("root", disasm, pc, memory));
  }

  running(): boolean {
    // delegate to threads
    return 0 < this.threads.filter((thread: Thread) => thread.running).length;
  }

  executed(): Array<number> {
    const set = new Set(this.threads.flatMap((thread: Thread) => [...thread.getExecuted()]));
    return Array.from(set.keys()).sort();
  }

  written(): Array<number> {
    const set = new Set(this.threads.flatMap((thread: Thread) => [...thread.getWritten()]));
    return Array.from(set.keys()).sort();
  }

  /**
   * Advance all threads.
   */
  step() {
    this.threads.filter((t) => t.running).forEach((t) => {
      try {
        t.step();
      } catch (e) {
        console.error(`${t.descriptor} had error`, e);
      }
    });
  }

}

export {Tracer};