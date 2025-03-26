/*
 * Semi-static analyser for identifying code in memory. Simpler than an emulator, follows executed instructions
 * without modifying register state, memory state or producing io side effects.
 *
 * Follows machine code execution flows of directed acyclic graphs in memory to build set of possible next instructions.
 *
 * Note that code paths may be unreachable in practice because each side of a branch condition is always explored.
 *
 * Not initially intended to help with self-mod code. The most general form of that is famously intractable but case
 * analysis may help to contain certain examples. Two paths forward on that may be 1. monte-carlo simulation using full
 * emulator; 2. user-interactive designation for specific code stored as special-cases in a database, also self-mod
 * idioms may be recognised this same way across different code bases.
 */

import {Disassembler} from "./asm/Disassembler";
import {Addr, Endian, hex16} from "./core";
import {Memory} from "./Memory.ts";
import {Thread} from "./Thread.ts";

/**
 * Models all addresses occupied by a single instruction and their length.
 * Currently we only support instructions of length 1, 2 or 3.
 */
type InstRec = [Addr, 1 | 2 | 3];


/**
 * Take an instruction address and length and return each address the instruction occupies.
 * @param ir the instruction address and length
 */
function enumInstAddr(ir: InstRec): Addr[] {
  const base = ir[0];
  const len = ir[1];
  if (len == 1) {
    return [base];
  } else if (len == 2) {
    return [base, base + 1];
  } else {
    return [base, base + 1, base + 2]
  }
}

/**
 * Analyser that approximates code execution to some degree. Static analysis ignores register and memory contents,
 * following all theoretically reachable code paths from the entry point.
 * Each call to step() advances all execution paths by one instruction. May not terminate, but if it does, running()
 * will return false.
 */
class Tracer {
  private threads: Thread[] = [];
  private stepCount = 0;
  /**
   * Track the instruction bytes executed
   * @private
   */
  private readonly executedAddresses: Array<InstRec>; // TODO maybe store set?

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
  private getExecuted: () => InstRec[] = () => {
    return [...this.executedAddresses];
  };

  /**
   * Create a Tracer with a single Memory and single thread of execution at pc.
   * Starts in a running state without having taken any step.
   *
   * @param disasm used to interpret memory as instructions
   * @param entryPoints each is a program counter and label for starting trace
   * @param memory the Memory in which to load and execute the program
   */
  constructor(
      disasm: Disassembler,
      entryPoints: [pc: number, label: string][],
      memory: Memory<Endian>,
      ignore = (_: Addr) => false) {

    entryPoints.forEach(ep => {
      const pc = ep[0];
      const relativePc = pc - disasm.getSegmentBaseAddress();
      if (Math.round(pc) !== pc) {
        throw Error(`pc must be integer`);
      } else if (relativePc < 0 || memory.getLength() <= relativePc) {
        throw Error(`initial pc 0x${hex16(pc)} not inside memory of size ${memory.getLength()} at base 0x${hex16(disasm.getSegmentBaseAddress())}`);
      } else if (!memory.executable()) {
        throw Error("memory not marked for execution");
      }
    });
    this.executedAddresses = [];
    // load the binary content at the load address of the given memory
    memory.load(disasm.getContentBytes(), disasm.getSegmentBaseAddress())
    const addExecuted = (ir: InstRec) => {
      this.executedAddresses.push(ir);
      disasm.addExecutionPoints([ir]);
    };
    entryPoints.forEach(ep => {
      this.threads.push(new Thread(ep[1], disasm, ep[0], memory, addExecuted, this.getExecuted, ignore));
    })
  }

  /**
   * Return all bytes (opcodes and operands) belonging to instructions that were executed.
   */
  getExecutedInstructionBytes(): Array<Addr> {
    return this.getExecuted().flatMap(enumInstAddr);
  }

  /**
   * Whether or not the tracer has any active execution threads.
   */
  running(): boolean {
    // delegate to threads
    return 0 < this.countActiveThreads();
  }

  countActiveThreads() {
    return this.threads.filter((thread: Thread) => thread.running).length;
  }

  /**
   * All addresses of instructions that were executed. Does not include addresses of their operands.
   * Order is unspecified.
   */
  executed(): Array<Addr> {
    return Array.from(new Set(this.executedAddresses.map(ir => ir[0])));
  }

  /**
   * Advance one running thread (if any exist) by one instruction. Dead threads don't step.
   * There is no scheduling fairness, if many running threads exist, which one steps is
   * unspecified.
   */
  step() {
    const newThreads: Thread[] = [];
    const aThread = this.threads.find((t) => t.running)
    if (aThread) {
      const maybeThread = aThread.step();
      if (maybeThread) {
        newThreads.push(maybeThread);
      }
    } else {
      console.warn("found no running threads");
    }
    // add any newly spawned threads to our list
    newThreads.forEach(t => this.threads.push(t));
  }

  /**
   * Step all active threads
   */
  stepAll() {
    const newThreads: Thread[] = [];
    this.threads
        .filter((t) => t.running)
        .forEach((t) => {
          const maybeThread = t.step();
          if (maybeThread) {
            newThreads.push(maybeThread);
          }
        });
    // add any newly spawned threads to our list
    newThreads.forEach(t => this.threads.push(t));
  }

  /**
   * Run the trace for a maximum number of steps or until completion.
   * @param maxSteps
   * @return number of steps taken
   */
  trace(maxSteps: number): number {
    console.log(`starting trace with max steps ${maxSteps}`);
    const startCount = this.stepCount;
    // TODO consider spawned threads
    while (this.running() && this.stepCount < maxSteps) {
      this.step();
      this.stepCount += 1;
    }
    // we might not have started from zero
    const stepsTaken = this.stepCount - startCount;
    console.log(`traced ${stepsTaken} steps`);
    return stepsTaken;
  }

}

export {Tracer, type InstRec, enumInstAddr};