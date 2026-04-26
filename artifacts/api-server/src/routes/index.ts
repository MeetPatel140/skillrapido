import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import skillsRouter from "./skills";
import providersRouter from "./providers";
import jobsRouter from "./jobs";
import dashboardRouter from "./dashboard";
import walletRouter from "./wallet";
import adminRouter from "./admin";
import withdrawalsRouter from "./withdrawals";
import settingsRouter from "./settings";
import usersRouter from "./users";
import contentRouter from "./content";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(skillsRouter);
router.use(providersRouter);
router.use(jobsRouter);
router.use(dashboardRouter);
router.use(walletRouter);
router.use(adminRouter);
router.use(withdrawalsRouter);
router.use(settingsRouter);
router.use(usersRouter);
router.use(contentRouter);

export default router;
