import express from "express";
import {HashType} from "../common/analysis/HashType.js";
import {CorpusDb} from "../sys/CorpusDb.js";

const router = express.Router();

const mkRouter = (db: CorpusDb) => {
  return router.get('/:type/:hash', async (req, res) => {
    const type = req.params.type;
    const hash = req.params.hash;

    if (db.supportedHashes().indexOf(type as HashType) < 0) {
      // TODO review response code for this situation
      res.status(404).json({message: "hash not supported"}).end();
    } else {
      const hashLookup = db.findByHash(type as HashType, hash);
      res.json({results: hashLookup});
    }
  });

}


export default mkRouter;