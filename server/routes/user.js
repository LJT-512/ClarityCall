import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import * as userController from "../controllers/user.js";

const router = express.Router();

router.post("/user/signup", userController.signUp);
router.post("/user/signin", userController.signIn);
router.get("/user/info", isAuthenticated, userController.getUserInfo);

export default router;
