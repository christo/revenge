import * as R from "ramda";
import {Byteable} from "../Byteable.ts";
import {Addr, hex16} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {FullInstruction} from "../mos6502.ts";
import {InstRec} from "../sim/Tracer.ts";
import {LabelsComments} from "./asm.ts";
import {DisassemblyMeta} from "./DisassemblyMeta.ts";
import {Edict} from "./Edict.ts";
import {ByteDeclaration, FullInstructionLine, InstructionLike, SymDef} from "./instructions.ts";
import {InstructionSet} from "./InstructionSet.ts";
import {OpSemantics} from "./Op.ts";


/**
 * Stateful translator of bytes to their parsed instruction line
 */
class Disassembler {

  // TODO perf test adding a cache of address to instruction
  readonly contentStartIndex: number;
  currentIndex: number;
  readonly fb: FileBlob;

  private iset: InstructionSet;
  private readonly segmentBaseAddress: Addr;
  private readonly stats: Map<string, number>;
  private predefLc: [Addr, LabelsComments][];

  private disMeta: DisassemblyMeta;
  private symbolDefinitions: Map<string, SymDef<Addr>>;
  private executionPoints: InstRec[];

  constructor(iset: InstructionSet, fb: FileBlob, dm: DisassemblyMeta) {
    this.iset = iset;
    // get the index from the start of the FileBlob to the actual binary
    const index = dm.contentStartOffset();
    const bytes: number[] = fb.getBytes();
    if (index >= bytes.length || index < 0) {
      throw Error(`index '${index}' out of range for fb size: ${fb.getLength()}`);
    }
    this.contentStartIndex = index;
    this.currentIndex = index;
    this.fb = fb;
    this.segmentBaseAddress = dm.baseAddress(fb);

    this.predefLc = dm.resolveSymbols(fb);
    this.disMeta = dm;
    this.symbolDefinitions = new Map<string, SymDef<Addr>>();
    this.stats = new Map<string, number>();
    this.executionPoints = [];
  }

  get currentAddress(): Addr {
    return this.segmentBaseAddress + this.currentIndex - this.contentStartIndex;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Starting from one offset, read count bytes at most. Only reads up to the end of the file.
   * @param from must be 0+
   * @param count must be 1+ (defaults to 1)
   * @return the possibly empty array of actual bytes read.
   */
  readBytes(from: number, count = 1) {
    const i1 = R.max(0, from);
    const i2 = from + R.max(1, count);
    return this.fb.getBytes().slice(i1, i2).map(x => x & 0xff);
  }

  /**
   * Decides which {@link InstructionLike} should be constructed at the current index point
   * and advances the index by the correct number of bytes.
   *
   * Incorporates configured edicts which can force some data to be interpreted as code or data.
   *
   */
  nextInstructionLine(): InstructionLike | undefined {

    const lc = this.mkPredefLabelsComments(this.currentAddress);

    let instLike: InstructionLike | undefined;

    const maybeInstruction: InstructionLike | undefined = this.maybeMkEdict(lc);
    if (maybeInstruction !== undefined) {
      instLike = maybeInstruction;
    } else {
      const isIllegal = (n: number) => this.iset.op(n) === undefined;
      if (this.currentIndex >= this.fb.getLength()) {
        throw Error(`Cannot read past end of file`);
      }
      const opcode = this.peekByte();
      if (opcode === undefined) {
        throw Error(`Cannot get byte at offset ${this.currentIndex} from ${this.fb.name}`);
      } else if (isIllegal(opcode)) {
        // slurp up multiple illegal opcodes in a row
        let numBytes = 1;
        while (numBytes < this.bytesLeftInFile() && isIllegal(this.fb.read8(this.currentIndex + numBytes)!)) {
          numBytes++;
        }
        lc.addComments(numBytes === 1 ? "illegal opcode" : "illegal opcodes");
        instLike = new ByteDeclaration(this.eatBytes(numBytes), lc);
      } else {
        // if there are not enough bytes for this whole instruction, return a ByteDeclaration for this byte
        // we don't yet know if an instruction will fit for the next byte
        const instLen = this.iset.numBytes(opcode) || 1;

        const bytesLeft = this.bytesLeftInFile();
        if (bytesLeft < instLen) {
          lc.addComments("instruction won't fit");
          instLike = new ByteDeclaration(this.eatBytes(1), lc);
        } else {
          // normal instruction disassembly
          // console.log(`bytes left: ${bytesLeft} instruction len: ${instLen}`);
          instLike = this.edictAwareInstruction(opcode, lc);
        }
      }
    }
    return instLike;
  }

  isInBinary(addr: Addr) {
    return this.disMeta.isInBinary(addr, this.fb);
  }

  /**
   * Check if there's an edict n ahead of currentIndex
   * @param n number of bytes ahead to peek
   */
  edictAhead = (n: number) => this.disMeta.getEdict(this.currentIndex + n) !== undefined;

  /**
   * Peek ahead exactly n bytes and return true iff we know the byte belongs to an instruction
   * @param n
   */
  instructionByteAhead = (n: number) => {
    const address = this.currentAddress + n;
    const entries = this.disMeta.executionEntryPoints(this.fb);
    const isEntryPoint = entries.find(ar => ar[0] === address) !== undefined;
    return isEntryPoint || this.executionPoints.map(ir => ir[0]).includes(address);
  };

  /**
   * If the current byte is interpreted as an instruction, checks the bytes ahead for any defined edicts that would
   * clash with it, if they exist, then make ByteDeclaration up to the edict instead. If there is no clash, return the
   * instruction.
   *
   * @param currentByte the byte already read
   * @param lc labels and comments
   */
  edictAwareInstruction(currentByte: number, lc: LabelsComments): InstructionLike | undefined {

    // make an edict-enforced byte declaration of the given length
    const mkEdictInferredByteDec = (n: number, mesg = `inferred via edict@+${n}`) => {
      lc.addComments(mesg); // need a better way of communicating this to the user
      return new ByteDeclaration(this.eatBytes(n), lc);
    };

    const instLen = this.iset.numBytes(currentByte);
    // current index is the byte following the opcode which we've already checked for an edict
    // check for edict inside the bytes this instruction would need
    if (instLen === 2) {
      // only need to check one byte ahead
      if (this.edictAhead(1)) {
        return mkEdictInferredByteDec(1);
      } else if (this.instructionByteAhead(1)) {
        // Interpreting this as a two byte instruction consumes a byte from a known instruction,
        // therefore our only option is to construct a single byte declaration
        return mkEdictInferredByteDec(1, `inferred by instruction at $${hex16(this.currentAddress + 1)} (+1)`);
      }
    } else if (instLen === 3) {
      // need to check two bytes ahead
      if (this.edictAhead(2)) {
        return mkEdictInferredByteDec(2);
      } else if (this.instructionByteAhead(2)) {
        // conservatively declaring a single byte so we still disassemble instruction after that
        return mkEdictInferredByteDec(1, `inferred by instruction at $${hex16(this.currentAddress + 2)} (+2)`);
      }
    }
    // by now we know we must consume the current byte
    {
      const numInstructionBytes = this.iset.numBytes(currentByte) || 1
      const bytesRemaining = this.fb.getBytes().length - this.currentIndex;
      if (numInstructionBytes <= bytesRemaining) {
        // default operands are 0
        let firstOperandByte = 0;
        let secondOperandByte = 0;
        if (numInstructionBytes === 2) {
          firstOperandByte = this.fb.read8(this.currentIndex + 1);
        } else if (numInstructionBytes === 3) {
          firstOperandByte = this.fb.read8(this.currentIndex + 1);
          secondOperandByte = this.fb.read8(this.currentIndex + 2);
        }
        const instruction = this.iset.instruction(currentByte);
        if (instruction) {
          const il = new FullInstruction(instruction, firstOperandByte, secondOperandByte);
          this.currentIndex += (numInstructionBytes); // already consumed opcode
          return new FullInstructionLine(il, lc);
        } else {
          return undefined;
        }
      } else {
        console.error(`bytes remaining: ${bytesRemaining} instruction bytes: ${numInstructionBytes}`);
        throw Error(`Not enough bytes to disassemble instruction at index ${this.currentIndex}`);
      }
    }
  }

  addExecutionPoints(e: InstRec[]) {
    this.executionPoints.push(...e);
  }

  /**
   * Returns true only if end of binary has been reached.
   */
  hasNext() {
    return this.currentIndex < this.fb.getBytes().length;
  }

  /**
   * Returns zero or more {@link LabelsComments} defined for the given address.
   * @param addr
   */
  mkPredefLabelsComments(addr: Addr): LabelsComments {
    const lc = this.predefLc.filter(t => t[0] === addr).map(t => t[1]);
    return lc.reduce((p, c) => p.merge(c), new LabelsComments());
  }

  /**
   * Determine all jump targets both statically defined and implied by the given sequence of address,instruction
   * pairs. Only those targets that lie within the address range of our loaded binary are returned.
   *
   */
  jumpTargets = (instructions: [Addr, FullInstruction][]): Addr[] => {
    // collect predefined jump targets
    const fromDm = this.predefLc.map(t => t[0]);

    // instructions that are jumps and have a resolvable destination
    const resolvableJump = (addrInst: [number, FullInstruction]) => {
      const isJump = addrInst[1].instruction.op.any([OpSemantics.IS_UNCONDITIONAL_JUMP, OpSemantics.IS_CONDITIONAL_JUMP]);
      return isJump && addrInst[1].staticallyResolvableOperand();
    };

    // for all jump instructions, collect the destination address
    return instructions
        .filter(addrInst => resolvableJump(addrInst))   // only jumps, only statically resolvable
        .map(j => j[1].resolveOperandAddress(j[0]))     // resolve pc-relative operands
        .concat(fromDm)                                     // add the predefs
        .filter(this.addressInRange);                       // only those in range of the loaded binary
  };

  getSymbol = (addr: Addr): SymDef<Addr> | undefined => this.disMeta.getSymbolTable().byValue(addr);

  /** Keeps a record of a used symbol that must be added to the source output. */
  addSymbolDefinition = (symbol: SymDef<Addr>) => {
    this.symbolDefinitions.set(symbol.name, symbol);
  };

  /**
   * Adds to the value of the named statistic. If it's a new stat, first initialises it to zero.
   * @param name name of the statistic
   * @param x value to add, defaults to 1
   */
  addStat(name: string, x = 1) {
    this.setStat(name, x + (this.stats.get(name) || 0));
  }

  /**
   * Sets the stat with the given name to the given value regardless of whether it has
   * @param name
   * @param x
   */
  setStat(name: string, x: number) {
    this.stats.set(name, x);
  }

  getStats() {
    return this.stats;
  }

  /**
   * Disassemble one instruction from memory at given offset.
   *
   * @param mem
   * @param offset
   * @return instruction if it can be decoded at the offset
   * @throws if illegal state
   */
  disassemble1(mem: Byteable, offset: number): FullInstruction | undefined {
    const opcode = mem.read8(offset);
    const instLen = this.iset.numBytes(opcode) || 1
    const bytesRemaining = mem.getLength() - offset;
    if (instLen <= bytesRemaining) {
      // default operands are 0
      let firstOperandByte = 0;
      let secondOperandByte = 0;
      if (instLen >= 2) {
        firstOperandByte = mem.read8(offset + 1);
      }
      if (instLen === 3) {
        secondOperandByte = mem.read8(offset + 2);
      }
      if (instLen > 3) {
        throw Error(`Illegal state: number of instruction bytes > 3: ${instLen}`);
      }
      const instruction = this.iset.instruction(opcode);
      if (instruction) {
        return new FullInstruction(instruction, firstOperandByte, secondOperandByte);
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  /**
   * In the simplest case, the address the file was loaded into.
   */
  getSegmentBaseAddress(): Addr {
    return this.segmentBaseAddress;
  }

  /**
   * Return only the content bytes without any metadata like load address.
   */
  getContentBytes() {
    return this.fb.getBytes().slice(this.disMeta.contentStartOffset());
  }

  /**
   * Side effect: increases currentIndex
   * @private
   */
  private eatBytes(count: number): number[] {
    const bytes: number[] = [];
    for (let i = 1; i <= count; i++) {
      const value = this.fb.read8(this.currentIndex); // side effect
      if (typeof value === "undefined") {
        throw Error(`Illegal state, no byte at index ${this.currentIndex}`);
      } else {
        this.currentIndex++;
        bytes.push(value & 0xff);
      }

    }
    return bytes;
  }

  private peekByte = (): number => this.fb.read8(this.currentIndex);

  private bytesLeftInFile = (): number => this.fb.getBytes().length - this.currentIndex;

  /**
   * For a known instruction opcode, construct the instruction with the {@link LabelsComments} and consume the
   * requisite bytes.
   */
  private mkInstructionLine(opcode: number, labelsComments: LabelsComments): FullInstructionLine | undefined {
    const numInstructionBytes = this.iset.numBytes(opcode) || 1
    const bytesRemaining = this.fb.getBytes().length - this.currentIndex;
    if (numInstructionBytes <= bytesRemaining) {
      // default operands are 0
      let firstOperandByte = 0;
      let secondOperandByte = 0;
      if (numInstructionBytes === 2) {
        firstOperandByte = this.fb.read8(this.currentIndex + 1);
      } else if (numInstructionBytes === 3) {
        secondOperandByte = this.fb.read8(this.currentIndex + 2);
      }
      const instruction = this.iset.instruction(opcode);
      if (instruction) {
        const il = new FullInstruction(instruction, firstOperandByte, secondOperandByte);
        this.currentIndex += (numInstructionBytes - 1); // already consumed opcode
        return new FullInstructionLine(il, labelsComments);
      } else {
        return undefined;
      }
    } else {
      console.error(`bytes remaining: ${bytesRemaining} instruction bytes: ${numInstructionBytes}`);
      throw Error(`Not enough bytes to disassemble instruction at index ${this.currentIndex}`);
    }
  }

  /**
   * Returns true iff the given address is within the memory range of the currently loaded file.
   *
   * @param addr the address to query.
   */
  private addressInRange = (addr: Addr): boolean => {
    const notTooLow = addr >= this.segmentBaseAddress;
    const notTooHigh = addr <= this.segmentBaseAddress + this.fb.getLength() - this.contentStartIndex;
    return notTooLow && notTooHigh;
  };

  /**
   * Makes any edict declared for the current offset.
   * @param lc
   * @private
   */
  private maybeMkEdict(lc: LabelsComments): InstructionLike | undefined {
    // see if edict is declared for currentIndex
    const declaredEdict: Edict<InstructionLike> | undefined = this.disMeta.getEdict(this.currentIndex);
    if (declaredEdict !== undefined) {
      // either create as specified or fallback/compromise if it won't fit
      return this.edictOrBust(declaredEdict, this.bytesLeftInFile(), lc);
    }
    // no declared edict
    return undefined;
  }

  /**
   * If the given edict fits, create the
   */
  private edictOrBust(edict: Edict<InstructionLike>, remainingBytes: number, lc: LabelsComments): InstructionLike | undefined {
    // if we can't comply with edict in remaining bytes, make best effort
    const edictWillFit = edict.length <= remainingBytes;
    if (edictWillFit) {
      this.currentIndex += edict.length;
      return edict.create(this.fb);
    } else {
      // cannot comply, add comment
      const elc = edict.create(this.fb).labelsComments;
      const explainLc = elc.length() > 0 ? ` (preserving ${elc.length()} labels/comments)` : "";
      lc.addComments(`End of file clashes with edict${explainLc}: '${edict.describe()}'`);
      lc.merge(elc);
      this.currentIndex += remainingBytes;
    }
    return undefined;
  }
}

export {Disassembler};