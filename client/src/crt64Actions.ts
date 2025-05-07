import {C64_CRT} from "../../server/src/common/machine/cbm/c64.ts";
import {FileBlob} from "../../server/src/common/machine/FileBlob.ts";
import {BlobToActions, hexDumper} from "./machine/api.ts";

const crt64Actions: BlobToActions = (fileBlob: FileBlob) => ({
  t: C64_CRT,
  actions: [hexDumper(fileBlob)]
});
export {crt64Actions};