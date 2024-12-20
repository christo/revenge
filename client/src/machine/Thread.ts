import {Disassembler} from "./asm/Disassembler";
import {Addr, Endian} from "./core.ts";
import {OpSemantics} from "./Op.ts";
import {Memory} from "./Memory.ts";

/**
 * A single thread of execution which records all executed addresses and all written locations.
 */
export class Thread {
  private readonly disasm: Disassembler;
  /** This should be immutable */
  private readonly memory: Memory<Endian>;
  private readonly executed: Array<number>;
  private readonly written: Array<number>;
  private pc: number;
  readonly descriptor: string;

  /**
   * Starts in running mode.
   * @param disasm
   * @param pc address of next instruction to be executed
   * @param memory
   */
  constructor(creator: string, disasm: Disassembler, pc: Addr, memory: Memory<Endian>) {
    const memorySize = memory.getLength();
    if (memorySize < 1) {
      throw new Error(`Memory length too small: ${memorySize}`);
    }
    this.descriptor = `[${creator}](@${pc})`;
    this.disasm = disasm;
    this.pc = pc;
    this._running = true;
    this.memory = memory;
    this.executed = [];
    this.written = [];
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
   * Unconditional jump to new location.
   * @param loc absolute memory location to jump to
   */
  jump(loc: number) {
    if (!this.memory.contains(loc)) {
      throw Error(`invalid jump location ${loc}`);
    }
    this.pc = loc;
  }

  /**
   * Executes instruction at the current PC and advances the PC to the next isntruction. If the instruction there
   * has already been executed, this thread is stopped (there are different types of non-running).
   * instruction at tgoes to next instruction and if it hasn't already been executed, executes the next instruction.
   */
  step() {
    if (!this.running) {
      throw new Error("cannot step if stopped");
    }
    this.execute();
  }

  /**
   * Trace-execute the instruction. If it is a conditional branch it forks a thread. If it is a
   * jsr it pushes the appropriate address to the stack (6502 may not put return address), reaching
   * an already-traced address should cause the thread to stop, aka "join" and reaching a brk should
   * stop thread execution. Because it's not a full emulator and runs all branches
   * of any conditional branch, many instructions have no effect on the state of the tracer.
   * If an branching instruction occurs, the new {@link Thread} is returned, otherwise undefined.
   */
  private execute(): Thread | undefined {
    // console.log(`executing: ${this.descriptor}/${this.pc}`);
    // TODO confirm this.pc is the memory offset - what is the base address?
    const inst = this.disasm.disassemble1(this.memory, this.pc);
    // by default, increment PC by length of this instruction
    let nextPc = this.pc + inst.getLength();
    if (this.executed.includes(this.pc)) {
      console.log(`already executed ${this.pc}, terminating thread ${this}`);
      this._running = false;
    } else {
      const op = inst.instruction.op;
      if (op.any([OpSemantics.IS_BREAK, OpSemantics.IS_JAM])) {
        this._running = false;
      } else if (op.any([OpSemantics.IS_UNCONDITIONAL_JUMP])) {
        nextPc = inst.operandValue();
      }
    }

    // TODO handle join case, i.e. reaching already traced code
    // TODO handle fork case, i.e. conditional branch
    // TODO handle tracing interrupt handlers - these are tricky - perhaps we can just always trace them
    // TODO edge case: execution at an address could be byte-misaligned with previous execution resulting in
    //  different instruction decoding, so execution records should hold the first byte of the decoded instruction
    //  and coverage measurements imply that coverage of any subsequent bytes of the instruction is predicated on
    //  identifying the first byte. Only by concluding that subsequent bytes are never interpreted as first bytes by
    //  the tracer can the bytes be considered to have been completely covered. Such cases of misaligned
    //  instructions may be rare enough to simply report as anomalies at first and may even be more likely be a
    //  theoretical bug in the analysed code. This tracer will not detect all unreachable code paths since only a
    //  degenerate runtime state is represented.
    this.executed.push(this.pc);
    this.pc = nextPc; // increment PC by length of this instruction
    return undefined;
  }

  getExecuted(): Array<number> {
    return [...this.executed];
  }

  getWritten(): Array<number> {
    return [...this.written];
  }

  getPc() {
    return this.pc;
  }
}