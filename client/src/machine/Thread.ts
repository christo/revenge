import {Disassembler} from "./asm.ts";
import {Endian, Memory} from "./core.ts";

/**
 * A single thread of execution.
 */
export class Thread {
  /**
   * Top of the stack is always current program counter.
   */
  private readonly stack: number[];
  private readonly disasm: Disassembler;
  private readonly memory: Memory<Endian>;

  constructor(disasm: Disassembler, pc: number, memory: Memory<Endian>, stack = [pc]) {
    this.disasm = disasm;
    this.stack = stack;
    this._running = true;
    this.memory = memory;
  }

  private _running: boolean;

  /**
   * We might have executed a break instruction previously, in which case we are no longer running.
   * @return true only if can take another step.
   */
  get running(): boolean {
    return this._running;
  }

  /**
   * Split execution to another location, returns new Thread at loc.
   *
   * @param loc pc of new Thread
   */
  branch(loc: number): Thread {
    const stack = [...this.stack];
    stack[stack.length - 1] = loc;
    return new Thread(this.disasm, loc, this.memory, stack)
  }

  /**
   * Subroutine jump, pop returns to location current before push.
   * @param loc
   */
  push(loc: number) {
    this.stack.push(loc);
  }

  /**
   * Return (from subroutine) to the location on the top of the stack.
   */
  pop() {
    this.stack.pop();
  }

  /**
   * Unconditional jump to new location.
   * @param loc absolute memory location to jump to
   */
  jump(loc: number) {
    if (!this.memory.contains(loc)) {
      throw Error(`invalid jump location ${loc}`);
    }
    this.stack[this.stack.length - 1] = loc;
  }

  /**
   * Executes instruction at the current PC and advances the PC to the next isntruction. If the instruction there
   * has already been executed, this thread is stopped (there are different types of non-running).
   * instruction at tgoes to next instruction and if it hasn't already been executed, executes the next instruction.
   */
  step() {
    this.execute();
    // we may have just stopped running
    if (this.running) {
      // TODO use disassembler to calculate the next pc based on the current instruction length

    }

    // TODO need to keep a record of all visited memory locations so that we can decide to end this thread if we
    //  reach one of them (only 80% certain this assumption contains no caveats apart from self-mod)
  }

  /**
   * Trace-execute the instruction. If it is a conditional branch it forks a thread. If it is a
   * jsr it pushes the appropriate address to the stack (6502 may not put return address), reaching
   * an already-traced address should cause the thread to stop, aka "join" and reaching a brk should
   * stop thread execution. Because it's not a full emulator and runs all branches
   * of any conditional branch, many instructions have no effect on the state of the tracer.
   */
  private execute() {
    // TODO decode instruction category at PC


    // TODO handle stop case, i.e. BRK or CPU JAM
    // TODO handle join case, i.e. reaching already traced code
    // TODO handle fork case, i.e. conditional branch
    // TODO handle simple recording of execution at instruction address, must keep track of first byte and
    //  instruction length.
    // TODO edge case: execution at an address could be byte-misaligned with previous execution resulting in
    //  different instruction decoding, so execution records should hold the first byte of the decoded instruction
    //  and coverage measurements imply that coverage of any subsequent bytes of the instruction is predicated on
    //  identifying the first byte. Only by concluding that subsequent bytes are never interpreted as first bytes by
    //  the tracer can the bytes be considered to have been completely covered. Such cases of misaligned
    //  instructions may be rare enough to simply report as anomalies at first and may even be more likely be a
    //  theoretical bug in the analysed code. This tracer will not detect all unreachable code paths since only a
    //  degenerate runtime state is represented.
  }
}