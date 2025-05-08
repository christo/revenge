import {Environment} from "../../server/src/common/machine/asm/asm.ts";
import {RevengeDialect} from "../../server/src/common/machine/asm/RevengeDialect.ts";
import {BlobSniffer} from "../../server/src/common/machine/BlobSniffer.ts";
import {disassembleActual} from "../../server/src/common/machine/cbm/cbm.ts";
import {FileBlob} from "../../server/src/common/machine/FileBlob.ts";
import {TypeActions, UserAction} from "./api.ts";
import {hexDumper} from "./hexDumper.ts";

/**
 * User action that disassembles the file.
 */
function mkDisasmAction(t: BlobSniffer, fb: FileBlob): TypeActions {
  const dialect = new RevengeDialect(Environment.DEFAULT_ENV);  // to be made configurable later
  // type: array of at least one UserAction
  const userActions: [UserAction, ...UserAction[]] = [{
    label: "disassembly",
    f: async () => {
      return disassembleActual(fb, dialect, t.getMeta());
    }
  }, hexDumper(fb)];
  return {
    t: t,
    actions: userActions
  };
}

export {mkDisasmAction};