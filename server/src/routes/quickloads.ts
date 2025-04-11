import express from "express";
import fs from 'fs';
import path from 'path';
import {FileLike} from "../common/FileLike";

const router = express.Router();


// init the preloads dir
const PRELOADS_DIR_C64 = "data/preload/c64";
const PRELOADS_DIR_VIC20 = "data/preload/vic20";

function getPreloads(fromPath: string): FileLike[] {
  let plDir = path.join(".", fromPath);

  return fs.readdirSync(plDir).filter(f => !f.startsWith(".")).map(fname => {
    const fileContents = fs.readFileSync(path.join(".", fromPath, fname));
    let data = Uint8Array.from(fileContents);
    console.log(`preparing preload blob ${fname}`);
    // TODO QUICK just call constructor here
    let fl: FileLike = {
      name: fname,
      data: Array.from(fileContents),
      size: data.length,
    };
    return fl;
  });
}

const PRELOADS_VIC20: FileLike[] = getPreloads(PRELOADS_DIR_VIC20);
const PRELOADS_C64: FileLike[] = getPreloads(PRELOADS_DIR_C64);

router.get('/', async (_req, res) => {
  console.log(`typeof vic20[0].data : ${typeof PRELOADS_VIC20[0].data}`);
  res.json({VIC20: PRELOADS_VIC20, C64: PRELOADS_C64});
});

export default router;