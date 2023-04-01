import {BlobSniffer} from "./asm";
import {FileBlob} from "./FileBlob";
import {hex8} from "./core";

/**
 * Abstraction for representing data with a tag. This makes transformation to html and also text
 * straightforward without any web dependencies, although the tag names must conform to the rules
 * for css classes (e.g. space-separated).
 * @deprecated migrate to Tag2
 */
type Tag = [string, string]

/**
 * Renderable output of structured text with html-friendly structure and internal text renderer.
 * To be a replacement for {@link Tag}
 */
class Tag2 {
    tags:string[];
    id:string | undefined;
    data:[string, string][];
    value:string;

    static fromTag(tag:Tag) {
        return new Tag2(tag[1], tag[0].split(" "))
    }

    constructor(value:string, tags: string[], id: string | undefined = undefined, data: [string, string][] = []) {
        this.tags = tags;
        this.id = id;
        this.data = data;
        this.value = value;
    }

    hasTag(s:string) {
        return this.tags.find(x => x === s) !== undefined;
    }

}

/**
 * Abstraction that corresponds to a logical line of listing output.
 */
type TagSeq = Tag2[]

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
        const elements: TagSeq = Array.from(fb.bytes).map(x => Tag2.fromTag(["hexbyte", hex8(x)]));
        return new Detail(["hexbytes"], [elements]);
    }
});

export {BooBoo, Detail, hexDumper, Tag2};
export type {
    TagSeq,
    Tag,
    ActionExecutor,
    BlobToActions,
    ActionFunction,
    UserAction,
    DataView,
    TypeActions,
    Continuation
};