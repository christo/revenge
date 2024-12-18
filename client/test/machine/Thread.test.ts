import {expect} from 'chai';
import {ArrayMemory, LE} from "../../src/machine/core";
import {Thread} from "../../src/machine/Thread";
import {createDisassembler} from "./util";

describe("thread", () => {
  it("records executed instructions", () => {
    const contents = [0, 0, 0xea, 0xea]; // 0, 0, NOP, NOP
    const memory = new ArrayMemory(contents, LE, true, true);
    const d = createDisassembler(contents, 2);
    const t = new Thread("test", d, 0, memory);
    t.step();
    expect(t.getExecuted().length).to.eq(1);
  });
});
