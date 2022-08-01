class FileBlob {
    public static NULL_FILE_BLOB:FileBlob = new FileBlob("null", 0, new Uint8Array(0));

    name: string;
    size: number;
    bytes: Uint8Array;

    constructor(name: string, size: number, bytes: Uint8Array) {
        this.name = name;
        this.size = size;
        this.bytes = bytes;
    }

    static async fromFile(file:File):Promise<FileBlob>  {
        return file.arrayBuffer().then((buf:ArrayBuffer) => {
            return new FileBlob(file.name, file.size, new Uint8Array(buf));
        });
    }

    toHexBytes():string[] {
        let elements: string[] = [];
        for (const [_index, entry] of this.bytes.entries()) {
            elements.push((entry & 0xFF).toString(16).padStart(2, '0'));
        }
        return elements;
    }
}

class BlobType {
    name: string;
    desc: string;
    exts: string[];
    note: string;

    constructor(name:string, desc:string, ext?:string) {
        this.desc = desc;
        this.name = name;
        this.exts = [];
        if (ext) {
            this.exts.push(ext);
        }
        this.note = "";
    }

    extensionMatch(filename:string) {
        return this.exts.reduce((a, n) => a || filename.toLowerCase().endsWith("."+n), false);
    }

    setNote(note:string) {
        this.note = note
    }
}

const UNKNOWN = new BlobType("unknown", "type not detected")
const PRG = new BlobType("prg", "program file", "prg");
PRG.setNote('PRG files have a relatively free format and detection relies on the file extension.');
const CRT = new BlobType("cart", "cartridge binary", "crt");
// TODO CRT format as detailed here: https://codebase64.org/doku.php?id=base:crt_file_format


export {FileBlob, BlobType, PRG, CRT, UNKNOWN}
