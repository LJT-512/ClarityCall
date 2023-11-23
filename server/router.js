import express from "express";
import upload from "./middlewares/multer.js";
import { breakoutRooms } from "./controllers/breakoutroom.js";
import { authenticate } from "./middlewares/authenticate.js";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.post("/api/upload", upload.single("audio"), (req, res) => {
  res.send({ message: "File uploaded successfully." });
});

router.post("/api/breakoutroom", breakoutRooms);

export default router;
