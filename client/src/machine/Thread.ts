import {Disassembler} from "./asm/Disassembler";
import {OpSemantics} from "./asm/Op.ts";
import {Addr, Endian, hex16} from "./core.ts";
import {Memory} from "./Memory.ts";

import {MODE_INDIRECT} from "./mos6502.ts";
import {InstRec} from "./Tracer.ts";

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
 * A single thread of execution which records all executed addresses and all written locations.
 */
export class Thread {
  readonly descriptor: string;
  private readonly disasm: Disassembler;
  /** This should be properly immutable */
  private readonly memory: Memory<Endian>;

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
  private readonly ignore: (addr: Addr) => boolean;
  private readonly addExecuted: (ir: InstRec) => void;
  private readonly getExecuted: () => InstRec[];

  /** Whether we are running. False iff we have reached a termination point. */
  private _running: boolean;
  private terminationReason: string;

  /**
   * Starts in running mode.
   *
   * @param creator descriptor of thread that created this
   * @param disasm disassembler to identify instruction semantics
   * @param pc address of next instruction to be executed
   * @param memory contains code to run
   * @param ignore function to indicate whether to ignore a given address, defaults to ignoring none.
   */
  constructor(creator: string, disasm: Disassembler, pc: Addr, memory: Memory<Endian>,
              addExecuted:(addr: InstRec) => void, getExecuted: () => InstRec[],
              ignore = (_: Addr) => false) {
    const memorySize = memory.getLength();
    if (memorySize < 1) {
      throw new Error(`Memory length too small: ${memorySize}`);
    }
    this.descriptor = `${creator}/@${hex16(pc)}`;
    this.disasm = disasm;
    this.pc = pc;
    this.memory = memory;
    this.addExecuted = addExecuted;
    this.getExecuted = getExecuted;
    this.ignore = ignore;
    this._running = true;
    this.terminationReason = '';

    this.errors = [];
  }



  /**
   * We might have executed a break instruction previously, in which case we are no longer running.
   * @return true only if can take another step.
   */
  get running(): boolean {
    return this._running;
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
    //console.log(`Thread: ${this.descriptor} @ 0x${hex16(this.pc)} (${this.pc})`);
    return this.execute();
  }



  /**
   * Return all bytes (opcodes and operands) belonging to instructions that were executed.
   */
  getExecutedInstructionBytes(): Array<Addr> {
    return this.getExecuted().flatMap(enumInstAddr);
  }

  getPc() {
    return this.pc;
  }

  getTerminationReason(): string {
    return this.terminationReason;
  }

  private terminate(reason: string) {
    const mesg = `${reason} @ ${this.renderPc()}`;
    this.terminationReason = mesg;
    this._running = false;
    console.log(`${this.descriptor} terminated ${mesg}`);
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
    if (this.getExecuted().flatMap(enumInstAddr).includes(this.pc)) {
      this.terminate("instruction already executed");
    } else {
      const op = inst.instruction.op;
      if (op.has(OpSemantics.IS_BREAK)) {
        this.terminate("reached a break instruction");
      } else if(op.has(OpSemantics.IS_JAM)) {
        this.terminate("reached a jam")
      } else if (op.has(OpSemantics.IS_RETURN)) {
        this.terminate("reached a return")
      } else if (op.any([OpSemantics.IS_UNCONDITIONAL_JUMP])) {
        // TODO introduce OpSemantics for indirection to remove explicit dependency on 6502 addressing mode
        if (inst.instruction.mode === MODE_INDIRECT) {
          // JMP ($1337)
          // TODO indirect jump support probably needs a more complete emulation because the jump target
          //  may have been modified and we do not currently calculate all memory modifications
          console.error(`unsupported indirect mode jump instruction at ${this.renderPc()}`);
          this.errors.push([this.pc, "indirect mode jump is unsupported"])
        } else {
          const jumpTarget = inst.operandValue();
          if (!this.ignore(jumpTarget)) {
            nextPc = jumpTarget;
          }
        }
      } else if (op.has(OpSemantics.IS_CONDITIONAL_JUMP)) {
        // the program counter already advances before calculating relative offset
        const jumpTarget = inst.resolveOperandAddress(nextPc);
        // don't bother spawning if we've already executed that instruction
        if (!this.getExecuted().find(ir => ir[0] === jumpTarget)) {
          // spawned thread takes the jump
          maybeThread = new Thread(this.descriptor, this.disasm, jumpTarget, this.memory, this.addExecuted, this.getExecuted, this.ignore);
        }
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
    this.addExecuted([this.pc, instLen as 1 | 2 | 3]);
    this.pc = nextPc;
    return maybeThread;
  }

  private renderPc() {
    return `0x${this.pc.toString(16)} (${this.pc})`
  }
}