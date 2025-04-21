import express, {Router} from "express";

const router: Router = express.Router();

/*
 * GET home page.
 * TODO make this work with the frontend build, should be a static serve
 */
router.get('/', (_req, res, _next) => {
  res.render('main', {title: 'Revenge'});
  console.log("index get cjm");
});

export default router;