/*
 * Follows machine code execution flows of directed acyclic graphs in memory to build set of possible next instructions,
 * with some caveats such as no self-modified code or indexed addressing in jump/branch operands (where applicable).
 *
 * Not initially intended to help with self-mod code. The most general form of that is famously intractable but case
 * analysis may help to contain certain examples. Two paths forward on that may be 1. monte-carlo simulation using full
 * emulator; 2. user-interactive designation for specific code stored as special-cases in a database, also self-mod
 * idioms may be recognised this same way across different code bases.
 */

import {Endian, hex16} from "./core";
import {Disassembler} from "./asm/Disassembler";
import {Thread} from "./Thread.ts";
import {Memory} from "./Memory.ts";

/**
 * Analyser that approximates code execution to some degree. Static analysis ignores register and memory contents,
 * following all theoretically reachable code paths from the entry point.
 * Each call to step() advances all execution paths by one instruction. May not terminate, but if it does, running()
 * will return false.
 */
class Tracer {
  threads: Thread[] = [];

  // TODO: keep track of locations written to (data)
  // TODO: identify self-mod code and raise exception
  //    * if address is written to that is part of an executed instruction (need to track all bytes of instruction)
  //    * if a written to address is disassembled as opcode or operand byte
  // TODO: identify code vs data. Data may be written to without causing self-mod.
  // TODO: a history of executed locations and their stacks(!), when revisiting with the same stack, kill that thread
  //          maybe we can only afford to do this for empty stacks? maybe certain small stacks of say 1 or 2 size?
  //          maybe we can collapse sequences of step instructions?, halts, unconditional jumps, conditional
  //          jumps (forks) and subroutine jumps (deferred steps).
  // TODO: a list of contiguous memory regions which can contain executable code
  // FUTURE: would also be nice to know if a memory location is writeable

  /**
   * Create a Tracer with a single Memory and single thread of execution at startLocation.
   *
   * @param disasm used to interpret memory as instructions
   * @param pc program counter; absolute address in the memory of next instruction to execute.
   * @param memory the Memory in which to load and execute the program
   */
  constructor(disasm: Disassembler, pc: number, memory: Memory<Endian>) {
    const relativePc = pc - disasm.getSegmentBaseAddress();
    if (Math.round(pc) !== pc) {
      throw Error(`startLocation must be integral`);
    } else if (relativePc < 0 || memory.getLength() <= relativePc) {
      throw Error(`startLocation 0x${hex16(pc)} not inside memory of size ${memory.getLength()} at base 0x${hex16(disasm.getSegmentBaseAddress())}`);
    } else if (!memory.executable()) {
      throw Error("memory not marked for execution");
    }
    // load the binary content at the load address of the given memory
    memory.load(disasm.getContentBytes(), disasm.getSegmentBaseAddress())
    this.threads.push(new Thread("root", disasm, pc, memory));
  }

  /**
   * Whether or not the tracer has any active execution threads.
   */
  running(): boolean {
    // delegate to threads
    return 0 < this.threads.filter((thread: Thread) => thread.running).length;
  }

  /**
   * All addresses of instructions that were executed. Does not include addresses of their operands.
   * Order is unspecified.
   */
  executed(): Array<number> {
    const set = new Set(this.threads.flatMap((thread: Thread) => [...thread.getExecuted()]));
    return Array.from(set.keys()).sort();
  }

  /**
   * All addresses that were possibly written to in all theoretical execution paths.
   */
  written(): Array<number> {
    const set = new Set(this.threads.flatMap((thread: Thread) => [...thread.getWritten()]));
    return Array.from(set.keys()).sort();
  }

  /**
   * Advance all running threads by one instruction, ignoring the rest.
   */
  step() {
    this.threads
        .filter((t) => t.running)
        .forEach((t) => t.step());
  }
}

export {Tracer};