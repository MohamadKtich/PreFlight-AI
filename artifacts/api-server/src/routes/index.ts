import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preflightRouter from "./preflight";

const router: IRouter = Router();

router.use(healthRouter);
router.use(preflightRouter);

export default router;
