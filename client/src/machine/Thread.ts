import {Disassembler} from "./asm/Disassembler";
import {Addr, Endian, Memory} from "./core.ts";

/**
 * A single thread of execution which records all executed addresses and all written locations.
 */
export class Thread {
  private readonly disasm: Disassembler;
  /** This should be immutable */
  private readonly memory: Memory<Endian>;
  private readonly executed: boolean[];
  private readonly written: boolean[];
  private pc: number;

  /**
   * Starts in running mode.
   * @param disasm
   * @param pc address of next instruction to be executed
   * @param memory
   */
  constructor(disasm: Disassembler, pc: Addr, memory: Memory<Endian>) {
    this.disasm = disasm;
    this.pc = pc;
    this._running = true;
    if (memory.getLength() < 1) {
      throw new Error(`Memory length too small: ${memory.getLength()}`);
    }
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

    // TODO need to keep a record of all visited memory locations so that we can decide to end this thread if we
    //  reach one of them (only 80% certain this assumption contains no caveats apart from self-mod)
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
    // TODO disassemble instruction at PC


    // TODO handle stop cases, i.e. BRK or CPU JAM
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
    return undefined;
  }
}