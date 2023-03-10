import express from "express";
import fs from 'fs';
import path from 'path';

const router = express.Router();

interface FileLike {
    name: string,
    data: number[],
    size: number;
}

// init the preloads dir
const PRELOADS_DIR = "data/preload";
let PLDIR = path.join(".", PRELOADS_DIR);
const PRELOADS: FileLike[] = fs.readdirSync(PLDIR).map(fname => {
    let data = Array.from(fs.readFileSync(path.join(".", PRELOADS_DIR, fname)));
    let fl:FileLike = {
        name: fname,
        data: data,
        size: data.length
    };
    return fl;
});

router.get('/', async (req, res) => {
    res.json(PRELOADS);
});

export default router;