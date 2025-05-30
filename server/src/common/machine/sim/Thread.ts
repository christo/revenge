import {Disassembler} from "../asm/Disassembler.js";
import {OpSemantics} from "../asm/Op.js";
import {Addr, hex16} from "../core.js";
import {Endian} from "../Endian.js";
import {Memory} from "../Memory.js";
import {FullInstruction, MODE_INDIRECT, ST} from "../mos6502.js";
import {enumInstAddr, InstRec} from "./Tracer.js";


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
  private terminationReason: string;
  private readonly written: Addr[];
  private readonly read: Addr[];

  /**
   * Starts in running mode.
   *
   * @param creator descriptor of thread that created this
   * @param disasm disassembler to identify instruction semantics
   * @param pc address of next instruction to be executed
   * @param memory contains code to run
   * @param addExecuted function called when adding an executed address
   * @param getExecuted function if called must return all executed addresses
   * @param ignore function to indicate whether to ignore a given address, defaults to ignoring none.
   */
  constructor(creator: string, disasm: Disassembler, pc: Addr, memory: Memory<Endian>,
              addExecuted: (addr: InstRec) => void, getExecuted: () => InstRec[],
              ignore = (_: Addr) => false) {
    const memorySize = memory.getLength();
    if (memorySize < 1) {
      throw new Error(`Memory length too small: ${memorySize}`);
    }
    this.descriptor = `${creator}/@${hex16(pc)}`;
    this.disasm = disasm;
    this.pc = pc;
    this.memory = memory;
    this.written = [];
    this.read = [];
    this.addExecuted = addExecuted;
    this.getExecuted = getExecuted;
    this.ignore = ignore;
    this._running = true;
    this.terminationReason = '';

    this.errors = [];
  }

  /** Whether we are running. False iff we have reached a termination point. */
  private _running: boolean;

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
    // console.log(`Thread step: ${this.descriptor} @ 0x${hex16(this.pc)} (${this.pc})`);
    return this.execute();
  }

  getPc() {
    return this.pc;
  }

  getTerminationReason(): string {
    return this.terminationReason;
  }

  getWritten() {
    return this.written;
  }

  getRead() {
    return this.read;
  }

  private terminate(reason: string) {
    this.terminationReason = `${reason} @ ${this.renderPc()}`;
    this._running = false;
    // console.log(`${this.descriptor} terminated ${mesg}`);
  }

  /**
   * Is the byte at the pc part of a single or multi-byte instruction that has already been executed?
   * @param pc
   * @private
   */
  private byteBelongsToExecutedInstruction(pc: number) {
    // TODO may not be sufficient, what if one of our operand bytes is part of an executed instruction
    //   but not the opcode byte at the current pc?
    return this.getExecuted().flatMap(enumInstAddr).includes(pc);
  }

  /**
   * Trace-execute the instruction. If it is a conditional branch it forks a thread. If it is a
   * jsr it pushes the appropriate address to the stack (6502 has some quirks here), reaching
   * an already-traced address should cause the thread to stop, aka "join" and reaching a brk should
   * stop thread execution. Because it's not a full emulator and runs all branches
   * of any conditional branch, many instructions have no effect on the state of the tracer.
   * If an branching instruction occurs, the new {@link Thread} is returned, otherwise undefined.
   */
  private execute(): Thread | undefined {
    let maybeThread: Thread | undefined = undefined;

    const inst: FullInstruction | undefined = this.disasm.disassemble1(this.memory, this.pc);
    if (inst === undefined) {
      this.terminate(`cannot disassemble instruction at ${this.renderPc()}`)
    } else {
      // by default, increment PC by length of this instruction
      let instLen = 0;
      try {
        instLen = inst.getLength();
      } catch (e) {
        console.error(e);
      }
      let nextPc = this.pc + instLen;

      if (this.getExecuted().find(ir => ir[0] === this.pc)) {
        // this exact instruction was already executed
        this.terminate("instruction already executed");
      } else if (this.byteBelongsToExecutedInstruction(this.pc)) {
        // we haven't executed this instruction but have we executed an instruction that covers bytes
        // at the address of the pc before, i.e. as an operand byte?
        // theoretically this kind of code may be legitimate obfuscation, optimisation, excess cleverness,
        // dynamic code loading, selfmod or bugs. Until a software corpus is fully analysed, let's just
        // distinguish it from simple repetition here
        this.terminate("facing operand byte of instruction already executed (smells but not a strict problem)");
      } else {
        // we haven't executed an instruction at this location
        const op = inst.instruction.op;
        if (op.has(OpSemantics.IS_BREAK)) {
          this.terminate("reached a break instruction");
        } else if (op.has(OpSemantics.IS_JAM)) {
          this.terminate("reached a jam")
        } else if (op.has(OpSemantics.IS_RETURN)) {
          this.terminate("reached a return")
        } else if (op.any([OpSemantics.IS_CONDITIONAL_JUMP, OpSemantics.IS_RETURNABLE_JUMP])) {

          // We terminate at return and a forked thread takes a subroutine jump though intuitively
          // backwards it simplifies implementation and shouldn't make any difference.
          // Strictly this assumption is wrong, we may never actually return which makes jsr
          // equivalent to jmp with a stack push.
          // A more conventional way would be for the current thread to do the jump and come back upon
          // hitting a return but then threads would need a stack to keep the return address.

          // the program counter was already advanced before calculating any relative offset
          const jumpTarget = inst.resolveOperandAddress(nextPc);
          // don't bother spawning if we've already executed that instruction
          if (!this.getExecuted().find(ir => ir[0] === jumpTarget)) {
            // spawned thread takes the jump
            maybeThread = new Thread(this.descriptor, this.disasm, jumpTarget, this.memory, this.addExecuted, this.getExecuted, this.ignore);
          }
        } else if (op.any([OpSemantics.IS_UNCONDITIONAL_JUMP])) {
          if (inst.instruction.mode === MODE_INDIRECT) {
            const err = `unsupported indirect mode ${inst.instruction.op.mnemonic} instruction`;
            const mesg = `Thread ${this.descriptor} ${err} at ${this.renderPc()} [${inst.byteString()}]`;
            // console.warn(mesg);
            this.errors.push([this.pc, mesg]);
            this.terminate("reached unsupported indirect jump");
          } else {
            const jumpTarget = inst.operandValue();
            if (!this.ignore(jumpTarget)) {
              nextPc = jumpTarget;
            }
          }
        }
        // exclude stack read/write because we can't statically derive the address
        if (inst.staticallyResolvableOperand() && op.cat !== ST) {
          if (op.has(OpSemantics.IS_MEMORY_READ)) {
            this.read.push(inst.operandValue());
          }
          if (op.has(OpSemantics.IS_MEMORY_WRITE)) {
            this.written.push(inst.operandValue());
          }
        }
      }

      // TODO edge case: execution at an address could be byte-misaligned with previous execution resulting in
      //  different instruction decoding, so execution records should hold the first byte of the decoded instruction
      //  and coverage measurements imply that coverage of any subsequent bytes of the instruction is predicated on
      //  identifying the first byte. Only by concluding that subsequent bytes are never interpreted as first bytes by
      //  the tracer can the bytes be considered to have been completely covered. Such cases of misaligned
      //  instructions may be rare enough to simply report as anomalies at first and may even be more likely be a
      //  theoretical bug in the analysed code. This tracer will not detect all unreachable code paths since only a
      //  degenerate runtime state is represented.
      this.addExecuted([this.pc, inst]);
      this.pc = nextPc;
    }
    return maybeThread;
  }

  /** Renders program counter as a string in both hex and decimal */
  private renderPc() {
    return `0x${this.pc.toString(16)} (${this.pc})`
  }
}