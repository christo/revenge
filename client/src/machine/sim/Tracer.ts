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

import {Disassembler} from "../asm/Disassembler.ts";
import {Addr, hex16} from "../core.ts";
import {Endian} from "../Endian.ts";
import {Memory} from "../Memory.ts";
import {FullInstruction} from "../mos6502.ts";
import {Thread} from "./Thread.ts";

/**
 * A record of all executed instructions and their addresses.
 */
type InstRec = [Addr, FullInstruction];

/**
 * Take an instruction address and length and return each address the instruction occupies.
 * @param ir the instruction address and length
 */
function enumInstAddr(ir: InstRec): Addr[] {
  const base = ir[0];
  const inst = ir[1];
  const len = inst.getLength();
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
  private readonly executedList: Array<InstRec>; // TODO maybe store set?

  // TODO: keep track of locations written to (data)
  // future: identify self-mod code and raise exception
  //    * if address is written to that is part of an executed instruction (need to track all bytes of instruction)
  //    * if a written to address is disassembled as opcode or operand byte
  // TODO: identify code vs data. Data may be written to without causing self-mod.

  /**
   * Create a Tracer with a single Memory and single thread of execution at pc.
   * Starts in a running state without having taken any step.
   *
   * @param disasm used to interpret memory as instructions
   * @param entryPoints each is a program counter and label for starting trace
   * @param memory the Memory in which to load and execute the program
   * @param ignore function to decide whether to ignore an address at a location
   */
  constructor(
      disasm: Disassembler,
      entryPoints: [pc: number, label: string][],
      memory: Memory<Endian>,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ignore = (_: Addr) => false) {

    entryPoints.forEach(ep => {
      const pc = ep[0];
      if (Math.round(pc) !== pc) {
        throw Error(`pc must be integer`);
      } else if (pc < 0 || memory.getLength() <= pc) {
        const imageSize = disasm.fb.getLength();
        throw Error(`initial pc 0x${hex16(pc)} not inside memory of size ${memory.getLength()} binary size: ${imageSize} seg base 0x${hex16(disasm.getSegmentBaseAddress())}`);
      } else if (!memory.executable()) {
        throw Error("memory not marked for execution");
      }
    });
    this.executedList = [];
    // load the binary content at the load address of the given memory
    memory.load(disasm.getContentBytes(), disasm.getSegmentBaseAddress())
    const addExecuted = (ir: InstRec) => {
      this.executedList.push(ir);
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

  getWritten(): Array<Addr> {
    return Array.from(new Set(this.threads.flatMap(v => v.getWritten())));
  }

  getRead(): Array<Addr> {
    return Array.from(new Set(this.threads.flatMap(v => v.getRead())));
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
  executedAddresses(): Array<Addr> {
    return Array.from(new Set(this.executedList.map(ir => ir[0])));
  }

  /**
   * Advance one running thread (if any exist) by one instruction. Dead threads don't step.
   * There is no scheduling fairness, if many running threads exist, which one steps is
   * unspecified.
   */
  step() {
    // console.log(`stepping thread count: ${this.threads.length}`);
    const newThreads: Thread[] = [];
    const aThread = this.threads.find((t) => t.running)
    if (aThread) {
      const maybeThread = aThread.step();
      if (maybeThread) {
        // console.log(`creating thread`);
        newThreads.push(maybeThread);
      }
    } else {
      console.warn("found no running threads");
    }
    // add any newly spawned threads to our list
    newThreads.forEach(t => this.threads.push(t));
  }

  /**
   * Step all active threads by one - may result in threads terminating or spawning.
   * If no threads are in the running state, this does nothing.
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
   * Run the trace for a maximum number of steps or until completion. One thread stepping
   * once counts as a step. Which running thread is chosen to step at any given iteration
   * is undefined.
   * @param maxSteps
   * @return number of steps taken
   */
  trace(maxSteps: number): number {
    const startCount = this.stepCount;
    while (this.running() && this.stepCount < maxSteps) {
      this.step();
      this.stepCount += 1;
    }
    // we might not have started from zero
    return this.stepCount - startCount;
  }

  executedInstructions() {
    return this.executedList;
  }

  // FUTURE: would also be nice to know if a memory location is writeable
  private getExecuted: () => InstRec[] = () => {
    return [...this.executedList];
  };
}

export {Tracer, type InstRec, enumInstAddr};