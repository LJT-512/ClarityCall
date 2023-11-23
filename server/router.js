import express from "express";
import upload from "./middlewares/multer.js";
import { breakoutRooms } from "./controllers/breakoutroom.js";
import { authenticate } from "./middlewares/authenticate.js";
import * as userController from "./controllers/user.js";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.post("/api/upload", upload.single("audio"), (req, res) => {
  res.send({ message: "File uploaded successfully." });
});

router.post("/api/breakoutroom", breakoutRooms);

router.post("/api/user/signup", userController.signUp);
router.post("/api/user/signin", userController.signIn);

export default router;
