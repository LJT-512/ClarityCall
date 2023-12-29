import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.post("/upload", isAuthenticated, upload.single("audio"), (_req, res) => {
  res.send({ message: "File uploaded successfully." });
});

export default router;
