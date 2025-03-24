import {Disassembler} from "./asm/Disassembler";
import {OpSemantics} from "./asm/Op.ts";
import {Addr, Endian, hex16} from "./core.ts";
import {Memory} from "./Memory.ts";

import {MODE_INDIRECT} from "./mos6502.ts";

/**
 * Models all addresses occupied by a single instruction and their length.
 * Currently we only support instructions of length 1, 2 or 3.
 */
type InstRec = [Addr, 1 | 2 | 3];

/**
 * Take an instruction address and length and return each address the instruction occupies.
 * @param ir the instruction address and length
 */
function enumInstAddr(ir: InstRec) {
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
 * A single thread of execution which records all executed addresses and all written locations.
 */
export class Thread {
  readonly descriptor: string;
  private readonly disasm: Disassembler;
  /** This should be properly immutable */
  private readonly memory: Memory<Endian>;
  /**
   * Track the instruction bytes executed
   * @private
   */
  private readonly executed: Array<InstRec>;
  private readonly errors: Array<[Addr, string]>;

  /**
   * Current program counter.
   * @private
   */
  private pc: number;
  /**
   * Address ignore list, treated as no-ops
   * @private
   */
  private ignore: (addr: Addr) => boolean;

  /**
   * Starts in running mode.
   *
   * @param creator descriptor of thread that created this
   * @param disasm disassembler to identify instruction semantics
   * @param pc address of next instruction to be executed
   * @param memory contains code to run
   * @param ignore function to indicate whether to ignore a given address, defaults to ignoring none.
   */
  constructor(creator: string, disasm: Disassembler, pc: Addr, memory: Memory<Endian>, ignore = (_: Addr) => false) {
    const memorySize = memory.getLength();
    if (memorySize < 1) {
      throw new Error(`Memory length too small: ${memorySize}`);
    }
    this.descriptor = `${creator}/@${pc}`;
    this.disasm = disasm;
    this.pc = pc;
    this._running = true;
    this.memory = memory;
    this.executed = [];
    this.errors = [];
    this.ignore = ignore;
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
  step(): Thread | undefined {
    if (!this.running) {
      throw new Error("cannot step if stopped");
    }
    console.log(`Thread: 0x${hex16(this.pc)} ${this.pc} ${this.descriptor}`);
    return this.execute();
  }

  /**
   * Returns the addresses of the instructions that have been executed. Does not include bytes belonging to operands.
   */
  getExecuted(): Array<Addr> {
    // only return the address of the instruction itself since a theoretical non-self-mod program could reuse
    // an operand as an instruction which is a different trace execution
    return [...this.executed.map(il => il[0])];
  }

  /**
   * Return all bytes (opcodes and operands) belonging to instructions that were executed.
   */
  getExecutedInstructionBytes(): Array<Addr> {
    return this.executed.flatMap(enumInstAddr);
  }

  getPc() {
    return this.pc;
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
    const inst = this.disasm.disassemble1(this.memory, this.pc);
    // by default, increment PC by length of this instruction
    const instLen = inst.getLength();
    let nextPc = this.pc + instLen;
    let maybeThread: Thread | undefined = undefined;
    // have we executed an instruction that at the address of the pc before?
    if (this.executed.flatMap(enumInstAddr).includes(this.pc)) {
      console.log(`already executed ${this.pc}, terminating thread ${this}`);
      this._running = false;
    } else {
      const op = inst.instruction.op;
      if (op.any([OpSemantics.IS_BREAK, OpSemantics.IS_JAM])) {
        this._running = false;
      } else if (op.any([OpSemantics.IS_UNCONDITIONAL_JUMP])) {
        // TODO introduce OpSemantics for indirection to remove explicit dependency on 6502 addressing mode
        if (inst.instruction.mode === MODE_INDIRECT) {
          // JMP ($1337)
          // TODO indirect jump support probably needs a more complete emulation because their use
          //  implies the jump target is modified by running code updating the contents of memory at the address
          //  pointed to by the operand
          console.error(`unsupported indirect mode jump instruction at ${this.pc} 0x${this.pc.toString(16)}`);
          this.errors.push([this.pc, "indirect mode jump is unsupported"])
        } else {
          const jumpTarget = inst.operandValue();
          if (!this.ignore(jumpTarget)) {
            nextPc = jumpTarget;
          }
        }
      } else if (op.has(OpSemantics.IS_CONDITIONAL_JUMP)) {
        const jumpTarget = inst.resolveOperandAddress(nextPc);
        // spawned thread takes the jump
        maybeThread = new Thread(this.descriptor, this.disasm, jumpTarget, this.memory, this.ignore);
      }
    }

    // TODO handle tracing interrupt handlers - these are tricky - perhaps we can just always trace them
    // TODO edge case: execution at an address could be byte-misaligned with previous execution resulting in
    //  different instruction decoding, so execution records should hold the first byte of the decoded instruction
    //  and coverage measurements imply that coverage of any subsequent bytes of the instruction is predicated on
    //  identifying the first byte. Only by concluding that subsequent bytes are never interpreted as first bytes by
    //  the tracer can the bytes be considered to have been completely covered. Such cases of misaligned
    //  instructions may be rare enough to simply report as anomalies at first and may even be more likely be a
    //  theoretical bug in the analysed code. This tracer will not detect all unreachable code paths since only a
    //  degenerate runtime state is represented.
    this.executed.push([this.pc, instLen as InstLen]);
    this.pc = nextPc;
    return maybeThread;
  }
}