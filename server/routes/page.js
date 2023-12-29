import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isMeetingValid } from "../middlewares/meetingValidation.js";
import {
  serveActionPage,
  serveMeetingHistoryPage,
  serveMeetingPage,
  serveSigninPage,
} from "../controllers/serverPage.js";

const router = express.Router();

router.get("/action", serveActionPage);
router.get("/meetinghistory", isAuthenticated, serveMeetingHistoryPage);
router.get("/signin", serveSigninPage);
router.get("/", isAuthenticated, isMeetingValid, serveMeetingPage);

export default router;
