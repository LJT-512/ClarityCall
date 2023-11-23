import express from "express";
import dotenv from "dotenv";
import router from "./router.js";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { init as initIO } from "./io.js";
import setupSocketEvents from "./controllers/socketEvents.js";
import { startTranscriptionWorker } from "./workers/transcribe.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(router);

app.use(errorHandler);

const httpServer = createServer(app);
const io = initIO(httpServer);
setupSocketEvents(io);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startTranscriptionWorker(io);
});
