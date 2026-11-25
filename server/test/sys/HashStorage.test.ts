import {expect} from "chai";
import {mkdtempSync, rmSync} from "fs";
import {tmpdir} from "os";
import * as path from "node:path";
import {HashCalc} from "../../src/common/analysis/HashCalc.js";
import {HashStorage} from "../../src/sys/HashStorage.js";

const SHA1 = "da39a3ee5e6b4b0d3255bfef95601890afd80709";
const MD5 = "d41d8cd98f00b204e9800998ecf8427e";
const CRC32 = "00000000";
const NAME_WITH_SPACE = "some dir/some file.prg";

describe("HashStorage", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "hashstorage-"));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it("round-trips full hashes and names through save and load", () => {
    const saved = new HashCalc();
    saved.addSha1Hash(NAME_WITH_SPACE, SHA1);
    saved.addMd5Hash(NAME_WITH_SPACE, MD5);
    saved.addCrc32Hash(NAME_WITH_SPACE, CRC32);
    new HashStorage(dir).save(saved);

    const loaded = new HashCalc();
    new HashStorage(dir).load(loaded);
    expect(loaded.findSha1(SHA1)).to.eql([NAME_WITH_SPACE]);
    expect(loaded.findMd5(MD5)).to.eql([NAME_WITH_SPACE]);
    expect(loaded.findCrc32(CRC32)).to.eql([NAME_WITH_SPACE]);
  });
});
