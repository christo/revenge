import express, {Router} from "express";

const router: Router = express.Router();

/* GET home page. */
router.get('/', (req, res, _next) => {
  res.render('main', {title: 'Revenge'});
  console.log("index get cjm");
});

export default router;