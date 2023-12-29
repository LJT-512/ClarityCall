import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import * as meetingAnalyticsController from "../controllers/meetingAnalytics.js";
import { getTurnCredentials } from "../controllers/turnServer.js";

const router = express.Router();

router.get("/meetings/getTurnCredentials", isAuthenticated, getTurnCredentials);

router.get(
  "/meetings/aggregated",
  isAuthenticated,
  meetingAnalyticsController.getAggregatedInfo
);

router.get(
  "/meetings/logs",
  isAuthenticated,
  meetingAnalyticsController.getMeetingLogs
);

router.get(
  "/meetings/subtitles",
  isAuthenticated,
  meetingAnalyticsController.getMeetingSubtitles
);

router.get(
  "/meetings/summary",
  isAuthenticated,
  meetingAnalyticsController.getMeetingSummary
);

router.get(
  "/meetings/generateSummary",
  isAuthenticated,
  meetingAnalyticsController.getSummary
);

export default router;
