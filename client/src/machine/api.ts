import {BlobSniffer} from "./asm";
import {FileBlob} from "./FileBlob";
import {Address, Endian, hex8} from "./core";
import {Mos6502} from "./mos6502";

/**
 * Renderable output of structured text with html-friendly structure and internal text renderer.
 */
class Tag {
    tags: string[];
    id: string | undefined;
    data: [string, string][];
    value: string;

    constructor(value: string, tags: string | string[], id: string | undefined = undefined, data: [string, string][] = []) {
        this.tags = (typeof tags === "string") ? [tags] : tags;
        this.id = id;
        this.data = data;
        this.value = value;
    }

    hasTag(s: string) {
        return this.tags.find(x => x === s) !== undefined;
    }
}

/**
 * Abstraction that corresponds to a logical line of listing output. This may include multiple labels and comments
 * which are rendered onto multiple physical lines in a typical (dis)assembly listing.
 */
type TagSeq = Tag[]

/**
 * New type that holds a logical line. Need to be bidirectionally mapped to addresses and yet also we want to
 * generate listings where there are lines that have no address but they do usually belong in a specific place
 * in the listing. Macro definitions, for example, need to exist in the listing but they have no address location
 * and could be reordered so long as they adhere to dialect-enforced-rules about forward references inherited from
 * assemblers.
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
 * - Edicts produce these knock on effects although they're defined at offsets rather than addresses
 *
 *
 * TODO figure out how to manage the bijection between addresses and source lines
 */
class LogicalLine {

    tags: TagSeq;

    constructor(tags: TagSeq) {
        this.tags = tags;
    }

    getTags(): TagSeq {
        return this.tags;
    }
}

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of entries. Each entry is a sequence of
 * string tuples. The string tuple represents a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 */
type DataView = TagSeq[]; // 2d array of tuples

/**
 * Datastructure for all data interpretation output.
 */
class Detail {
    tags: string[];
    tfield: DataView;

    constructor(tags: string[], tfield: DataView) {
        this.tags = tags;
        this.tfield = tfield;
    }
}

/**
 * Main function for generating the file detail.
 */
type ActionExecutor = () => Detail;

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
 * Error class, all the sensible names have been domain squatted by typescript/javascript.
 */
class BooBoo {
    private mesg: string;

    constructor(mesg: string) {
        this.mesg = mesg;
    }
}

const hexDumper: (fb: FileBlob) => UserAction = (fb: FileBlob) => ({
    label: "Hex Dump",
    f: () => {
        const elements: TagSeq = Array.from(fb.bytes).map(x => new Tag(hex8(x), "hexbyte"));
        return new Detail(["hexbytes"], [elements]);
    }
});

/**
 * Available memory, basic load addres etc.
 */
class MemoryConfiguration {
    name: string;
    basicStart: Address;

    /**
     * A short UI string that uniquely annotates this memory configuration. In the case of C64 standard memory
     * configuration, this can be empty. Does not need to include any machine identifier.
     */
    shortName: string;

    /**
     * Create a memory configuration.
     *
     * @param name for display
     * @param basicStart 16 bit address where BASIC programs are loaded
     * @param shortName short designation for UI
     */
    constructor(name: string, basicStart: Address, shortName: string = "") {
        // future: various independent block configurations, now: simple!
        this.name = name;
        this.basicStart = basicStart;
        this.shortName = shortName;
    }
}

interface Computer extends Endian {
    cpu():Mos6502; // for now all computers have this CPU
    memory():MemoryConfiguration;
    name():string;
    tags():string[];
}

export {BooBoo, Detail, hexDumper, Tag, LogicalLine, MemoryConfiguration};
export type {
    Computer,
    TagSeq,
    ActionExecutor,
    BlobToActions,
    ActionFunction,
    UserAction,
    DataView,
    TypeActions,
    Continuation
};