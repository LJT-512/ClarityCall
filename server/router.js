import express from "express";
import upload from "./middlewares/multer.js";
import { breakoutRooms } from "./controllers/breakoutroom.js";
import { isAuthenticated } from "./middlewares/isAuthenticated.js";
import * as userController from "./controllers/user.js";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.get("/action", isAuthenticated, (req, res) => {
  res.sendFile(join(__dirname, "./public/action.html"));
});

router.get("/", isAuthenticated, (req, res) => {
  res.sendFile(join(__dirname, "./public/main.html"));
});

// router.get('/?roomId?', authenticate, serverRoomPage)

router.post("/api/upload", upload.single("audio"), (req, res) => {
  res.send({ message: "File uploaded successfully." });
});

router.post("/api/breakoutroom", breakoutRooms);

router.get("/signin", userController.serveSigninPage);
router.post("/api/user/signup", userController.signUp);
router.post("/api/user/signin", userController.signIn);
router.get("/api/user/info", isAuthenticated, userController.getUserInfo);

export default router;