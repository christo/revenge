import express, {Router} from "express";

const router:Router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'RevEngE' });
    console.log("index get cjm");
});

export default router;