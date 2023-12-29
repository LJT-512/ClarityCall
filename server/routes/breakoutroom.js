import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { breakoutRooms } from "../controllers/breakoutroom.js";

const router = express.Router();

router.post("/breakoutroom", isAuthenticated, breakoutRooms);

export default router;
