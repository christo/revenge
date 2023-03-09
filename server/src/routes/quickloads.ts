import express from "express";
import fs from 'fs';
import path from 'path';

const router = express.Router();

// init the preloads dir
const PRELOADS_DIR = "data/preload";
const PRELOADS: string[] = fs.readdirSync(path.join(".", PRELOADS_DIR));

router.get('/', async (req, res) => {
    res.json(PRELOADS);
});

export default router;