import {BlobSniffer, Instructionish} from "./asm";
import {Addr, BigEndian, hex8, LittleEndian, Memory} from "./core";
import {FileBlob} from "./FileBlob";
import {Mos6502} from "./mos6502";

/**
 * Renderable output of structured text with html-friendly structure and internal text renderer.
 */
class Tag {

    // TODO the naming of Tag feels misleading upon returning from a break

    tags: string[];
    id: string | undefined;
    data: [string, string][];
    value: string;

    constructor(tags: string | string[], value: string, id: string | undefined = undefined, data: [string, string][] = []) {
        this.tags = (typeof tags === "string") ? [tags] : tags;
        this.id = id;
        this.data = data;
        this.value = value;
    }

    hasTag(s: string) {
        return this.tags.find(x => x === s) !== undefined;
    }

    spacedTags() {
        return this.tags.join(" ");
    }

    hasTags(ts: string[]) {
        return ts.every((t) => this.tags.includes(t));
    }
}

export const TAG_IN_BINARY = "inbinary";
export const TAG_LABEL = "label";
export const TAG_COMMENT = "comment";
export const TAG_DATA = "data";
export const TAG_OPERAND = "opnd";
export const TAG_ABSOLUTE = "abs";
export const TAG_ADDRESS = "addr";
export const TAG_HEX = "hex";
export const TAG_LINE = "line";
export const TAG_LINE_NUM = "lnum";
export const TAG_NOTE = "note";
export const TAG_LINE_NUMBER = "lnum";
export const TAG_KEYWORD = 'kw';
export const TAG_HEXARRAY = "hexarray";
export const TAG_CODE = "code";
export const TAG_MNEMONIC = "mn";
export const TAG_OPERAND_VALUE = "opnd_val";
export const TAG_HEXBYTE = "hexbyte";
export const TAG_HEXBYTES = "hexbytes";

/**
 * Abstraction containing a sequence of rendered elements that belong on a logical line with meof listing output.
 * This may include multiple labels and comments which are rendered onto multiple physical lines in a typical
 * (dis)assembly listing. See {@link LogicalLine} for the fully-connected API type.
 */
type TagSeq = Tag[];

/**
 * Holds a logical line of source with its address and the {@link Instructionish}. Need to be bidirectionally mapped to
 * addresses and yet also we want to generate listings where there are lines that have no address, but they do usually
 * belong in a specific place in the listing. Macro definitions, for example, need to exist in the listing, but they
 * have no address location and could be reordered so long as they adhere to dialect-enforced-rules about forward
 * references inherited from assemblers.
 *
 * The mapping between addresses and source lines is bijective:
 *
 * - every byte corresponds to some component of a source line
 * - multiple source can be located between/before a given address (e.g. macro definitions, comments, labels)
 * - every byte has a unique address
 * - a source line can map to zero or more bytes
 * - instructions have variable byte length correspondence, so alternative instructions (e.g. code vs data) will
 * consume different numbers of bytes. Changing from an insruction to a byte definition may have a knock-on effect
 * that forces a different interpretation of following bytes.
 * - Edicts produce these knock on effects, although they're defined at offsets rather than addresses
 * - can have comments and no instructions
 * - can have labels but if it has a label it needs address
 * - labels are different to symbol assignment - label has an implicit "= *"
 *
 */
class LogicalLine {

    /** Temporary transition encapsulation, future: migrate to dynamic generation. */
    private readonly tags: TagSeq;
    private readonly address: Addr;
    private readonly instruction?: Instructionish;

    constructor(tags: TagSeq, address: Addr, instruction?: Instructionish) {
        this.tags = tags;
        this.address = address;
        this.instruction = instruction;
    }

    getTags(): TagSeq {
        // future: put address in tags dynamically and stop receiving it as a tag in constructor
        return this.tags;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @return possibly undefined instruction for this line
     */
    getInstruction() {
        return this.instruction;
    }

    // noinspection JSUnusedGlobalSymbols
    getAddress() {
        return this.address;
    }
}

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of entries. Each entry is a sequence of
 * string tuples. The string tuple represents a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 */
interface DataView {
    getLines(): LogicalLine[];

    addLine(ll: LogicalLine): void;
}

class DataViewImpl implements DataView {
    private lines: LogicalLine[];

    constructor(lines: LogicalLine[]) {
        this.lines = lines;
    }

    getLines(): LogicalLine[] {
        return this.lines;
    }

    addLine(ll: LogicalLine): void {
        this.lines.push(ll);
    }


}

/**
 * Data interpretation output form. Tags represent top level "folksonomy". Stats relay generic summary information.
 * The {@link DataView} holds the data itself.
 */
class Detail {
    private readonly _tags: string[];
    private readonly _stats: [string, string][];
    private readonly _dataView: DataView;

    constructor(tags: string[], dataView: DataView) {
        this._tags = tags;
        this._dataView = dataView;
        this._stats = [];
    }

    get tags(): string[] {
        return this._tags;
    }

    get stats(): [string, string][] {
        return this._stats;
    }

    get dataView(): DataView {
        return this._dataView;
    }
}

/**
 * Main function for generating the file detail.
 */
type ActionExecutor = () => Detail;

// noinspection JSUnusedGlobalSymbols
/** A type for handling the result of a UserAction execution */
type Continuation = (fo: ActionExecutor) => void;

/** Holds the UI button label and function to call when the button is clicked */
type UserAction = { label: string, f: ActionExecutor };

/**
 * Holds the sniffer and the set of actions that can be taken for this type. At least one action required.
 */
type TypeActions = { t: BlobSniffer, actions: [UserAction, ...UserAction[]] };

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the type and contents of a file.
 */
type ActionFunction = (t: BlobSniffer, fb: FileBlob) => TypeActions;

/** Function that produces TypeActions with only a {@link FileBlob}. */
type BlobToActions = (fileBlob: FileBlob) => TypeActions;

/**
 * Error class for user-reportable problems, all the sensible names have been domain squatted by typescript/javascript.
 */
class BooBoo {
    mesg: string;

    constructor(mesg: string) {
        this.mesg = mesg;
    }
}

const hexDumper: (fb: FileBlob) => UserAction = (fb: FileBlob) => ({
    label: "Hex Dump",
    f: () => {
        const elements: TagSeq = Array.from(fb.getBytes()).map((x) => new Tag(TAG_HEXBYTE, hex8(x)));
        // currently whole hex dump is a single logical line at no address with no instruction
        const oldDataView: TagSeq[] = [elements];
        const lls = oldDataView.map((ts: TagSeq, i: number) => new LogicalLine(ts, i));
        const newDataView: DataView = new DataViewImpl(lls);
        return new Detail([TAG_HEXBYTES], newDataView);
    }
});

/**
 * Available memory, basic load addres etc.
 */
class MemoryConfiguration {
    readonly name: string;
    readonly basicStart: Addr;

    /**
     * A short UI string that uniquely annotates this memory configuration. In the case of C64 standard memory
     * configuration, this can be empty. Does not need to include any machine identifier.
     */
    readonly shortName: string;

    /**
     * Create a memory configuration.
     *
     * @param name for display
     * @param basicStart 16 bit address where BASIC programs are loaded
     * @param shortName short designation for UI
     */
    constructor(name: string, basicStart: Addr, shortName = "") {
        // future: various independent block configurations, now: simple!
        this.name = name;
        this.basicStart = basicStart;
        this.shortName = shortName;
    }
}

abstract class Computer {
    private _cpu: Mos6502;
    private _memory: Memory<BigEndian | LittleEndian>;
    private readonly _memoryConfig: MemoryConfiguration;
    private readonly _name: string;
    private readonly _tags: string[];

    protected constructor(
        name: string,
        cpu: Mos6502,
        memory: Memory<BigEndian | LittleEndian>,
        memoryConfig: MemoryConfiguration,
        tags: string[]) {
        this._name = name;
        this._cpu = cpu;
        this._memory = memory;
        this._memoryConfig = memoryConfig;
        this._tags = tags;
    }

    get cpu() {
        return this._cpu;
    }

    memory() {
        return this._memoryConfig;
    }

    name() {
        return this._name;
    }

    tags() {
        return this._tags;
    }

    pushWordBytes(ba: number[], word: number) {
        return this._memory.endianness().pushWordBytes(ba, word);
    }
}

export {BooBoo, Detail, hexDumper, Tag, LogicalLine, MemoryConfiguration, DataViewImpl, Computer};
export type {
    TagSeq,
    ActionExecutor,
    BlobToActions,
    ActionFunction,
    UserAction,
    DataView,
    TypeActions,
    Continuation
};