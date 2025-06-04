import {DataViewImpl} from "../DataView.js";
import {Detail} from "../Detail.js";
import {Directive} from "./asm/Directive.js";
import {Disassembler} from "./asm/Disassembler.js";
import {DisassemblyMeta} from "./asm/DisassemblyMeta.js";
import {BLANK_LINE, InstructionLike, PcAssign, SymbolDefinition, SymDef} from "./asm/instructions.js";
import {RevengeDialect} from "./asm/RevengeDialect.js";
import {SymbolType} from "./asm/SymbolTable.js";
import {Addr, asHex, hex16} from "./core.js";
import {DisassemblyDetailConfig} from "./DisassemblyDetailConfig.js";
import {FileBlob} from "./FileBlob.js";
import {LogicalLine} from "./LogicalLine.js";
import {ArrayMemory} from "./Memory.js";
import {Mos6502} from "./mos6502.js";
import {InstRec, Tracer} from "./sim/Tracer.js";
import {
  Tag,
  TAG_ADDRESS,
  TAG_ADDRESS_WAS_READ,
  TAG_ADDRESS_WAS_WRITTEN,
  TAG_ENTRY_POINT,
  TAG_EXECUTED,
  TAG_HEX,
  TAG_LINE
} from "./Tag.js";

/**
 * Call the Disassembler for 6502 instruction set.
 *
 * @param fb binary to disassemble
 * @param dialect decides the output syntax
 * @param meta metadata about the disassembly context
 */
function disassembleActual(fb: FileBlob, dialect: RevengeDialect, meta: DisassemblyMeta): Detail {
  const dis = new Disassembler(Mos6502.ISA, fb, meta);
  const detail = new Detail("Disassembly", [TAG_LINE], new DataViewImpl([]), new DisassemblyDetailConfig(dialect))

  // do trace to decide which is code
  const traceResult: TraceResult = trace(dis, fb, meta);

  // start timer
  const startTime = Date.now();
  // console.log(`kernal symbols used: ${traceResult.kernalSymbolsUsed.length}`);
  // add the kernal symbol definitions first
  traceResult.kernalSymbolsUsed.forEach(symbol => {
    const symbolDefinition = new SymbolDefinition(symbol);
    detail.dataView.addLine(new LogicalLine(symbolDefinition.disassemble(dialect, dis), 0, undefined))
  });

  // trying out this idea, looks a little noisy still
  detail.dataView.addLine(new LogicalLine(BLANK_LINE.disassemble(dialect, dis), 0, undefined));

  // set the base address with a directive
  const assignPc: Directive = new PcAssign(dis.currentAddress, ["base"], ["load address"]);
  // this line corresponds to zero bytes
  detail.dataView.addLine(new LogicalLine(assignPc.disassemble(dialect, dis), 0, dis.currentAddress));
  // TODO this is where we must change to code path disassembly order
  while (dis.hasNext()) {
    const instAddress = dis.currentAddress;
    const inst: InstructionLike = dis.nextInstructionLine();
    const addressTags = [TAG_ADDRESS];
    if (traceResult.codeAddresses.includes(instAddress)) {
      addressTags.push(TAG_EXECUTED);
    }
    if (traceResult.writtenAddresses.includes(instAddress)) {
      addressTags.push(TAG_ADDRESS_WAS_WRITTEN);
    }
    if (traceResult.readAddresses.includes(instAddress)) {
      addressTags.push(TAG_ADDRESS_WAS_READ);
    }
    if (meta.executionEntryPoints(fb).map(as => as.index).includes(instAddress)) {
      addressTags.push(TAG_ENTRY_POINT);
    }
    const tags = [
      new Tag(addressTags, hex16(instAddress)),
      new Tag([TAG_HEX], asHex(inst.getBytes())),
      ...inst.disassemble(dialect, dis)
    ];
    detail.dataView.addLine(new LogicalLine(tags, inst.getLength(), instAddress, inst));
  }

  // TODO link up internal address references jump targets with synthetic label names
  const stats = dis.getStats();
  // for now assuming there's no doubling up of stats keys
  stats.forEach((v, k) => detail.stats.push([k, v.toString()]));
  detail.stats.push(["exec trace", `${traceResult.steps} steps, ${traceResult.traceTime} ms (${traceResult.endState})`]);
  const readsInBinary = traceResult.readAddresses.filter(a => meta.isInBinary(a, fb));
  const writesInBinary = traceResult.writtenAddresses.filter(a => meta.isInBinary(a, fb));
  detail.stats.push(["static memory reads", `${traceResult.readAddresses.length} (${readsInBinary.length} in binary)`]);
  detail.stats.push(["static memory writes", `${traceResult.writtenAddresses.length} (${writesInBinary.length} in binary)`]);

  detail.stats.push(["assembly lines", detail.dataView.getLines().length.toString()]);
  const timeTaken = Date.now() - startTime;
  detail.stats.push(["disassembled in", `${timeTaken}  ms`]);
  // TODO introduce detail having options as well as stats; dialect should be an option
  //  note that options should be able to have sub-options or dependent options
  detail.stats.push(["dialect", dialect.name]);
  detail.stats.push(["dialect info", dialect.description]);
  return detail;
}

type TraceResult = {
  codeAddresses: Addr[],
  traceTime: number,
  endState: string,
  steps: number,
  kernalSymbolsUsed: SymDef<Addr>[],
  executedInstructions: InstRec[],
  writtenAddresses: Addr[],
  readAddresses: Addr[],
}

/**
 * Does full trace
 * @param dis
 * @param fb
 * @param meta
 * @return a {@link TraceResult}
 */
function trace(dis: Disassembler, fb: FileBlob, meta: DisassemblyMeta): TraceResult {
  // fill with zeroes because they are break on 6502
  const LE_64K = ArrayMemory.zeroes(0x10000, Mos6502.ENDIANNESS, true, true);
  // TODO load system rom into memory instead of ignoring
  const symbolTable = meta.getSymbolTable();
  const isKernalSubroutine = (addr: Addr) => SymbolType.sub === symbolTable.byValue(addr)?.sType;
  const entryPoints = meta.executionEntryPoints(fb);

  const tracer = new Tracer(dis, entryPoints, LE_64K, isKernalSubroutine);
  const traceStart = Date.now();
  const stepsTaken = tracer.trace(10000);
  const endMessage = tracer.running() ? "did not terminate" : "completed";
  const traceTime = Date.now() - traceStart;
  const executedInstructions = tracer.executedInstructions();
  const writtenAddresses = tracer.getWritten();
  const readAddresses = tracer.getRead();
  const codeAddresses = [...tracer.executedAddresses()].sort();

  const kernalSymbolsUsed: Set<SymDef<number>> = new Set<SymDef<number>>();
  executedInstructions.forEach(ir => {
    // get the address of the operand and figure out if it is a symbol needing a definition
    const instruction = ir[1];
    // does instruction have an operand?
    if (instruction.getLength() > 1) {
      // can we resolve the operand?
      const gotOperand = instruction.staticallyResolvableOperand();
      if (gotOperand) {
        const operandValue = instruction.operandValue();
        const symDef = symbolTable.byValue(operandValue);
        if (operandValue && symDef) {
          kernalSymbolsUsed.add(symDef);
        }
      } else {
        // we cannot statically resolve this operand, we don't use it to build kernal symbols
        //console.warn(`no operand for ${instruction.instruction.op.mnemonic} instruction at ${addr} ${hex16(addr)}`);
      }
    }
  });

  return {
    codeAddresses: codeAddresses,
    kernalSymbolsUsed: Array.from(kernalSymbolsUsed),
    executedInstructions: executedInstructions,
    writtenAddresses: writtenAddresses,
    readAddresses: readAddresses,
    traceTime: traceTime,
    endState: endMessage,
    steps: stepsTaken
  };
}

export {trace};
export {disassembleActual};