import express from "express";
import fs from 'fs';
import path from 'path';
import {FileLike} from "../common/FileLike.js";
import {PRELOADS_DIR_C64, PRELOADS_DIR_VIC20} from "./constants.js";

const router = express.Router();

function getPreloads(fromPath: string): FileLike[] {
  let plDir = path.join(".", fromPath);

  return fs.readdirSync(plDir).filter(f => !f.startsWith(".")).map(fname => {
    console.log(`preparing preload blob ${fname}`);
    return new FileLike(fname, Array.from(fs.readFileSync(path.join(".", fromPath, fname))));
  });
}

const PRELOADS_VIC20: FileLike[] = getPreloads(PRELOADS_DIR_VIC20);
const PRELOADS_C64: FileLike[] = getPreloads(PRELOADS_DIR_C64);

router.get('/', async (_req, res) => {
  res.json({VIC20: PRELOADS_VIC20, C64: PRELOADS_C64});
});

export default router;