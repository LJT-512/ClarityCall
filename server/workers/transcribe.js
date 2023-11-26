import path from "path";
import fs from "fs";
import axios from "axios";
import { fileURLToPath } from "url";
import FormData from "form-data";
import chokidar from "chokidar";
import { Socket } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../public/uploads");
const apiKey = process.env.OPENAI_API_KEY;

function sendFileToWhisper(filePath, io) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  // form.append("language", "zh");
  form.append("model", "whisper-1");

  const config = {
    method: "POST",
    url: "https://api.openai.com/v1/audio/translations",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    data: form,
  };

  axios(config)
    .then((response) => {
      console.log("Full response:", response.data);
      console.log(JSON.stringify(response.data));
      console.log("Emitting subtitle:", response.data.text);
      io.emit("newSubtitle", {
        subtitle: response.data.text,
      });
      fs.unlinkSync(filePath);
    })
    .catch((err) => {
      console.error(
        "Falied to emit subtitle: ",
        "Error:",
        err.response ? err.response.data : err.message
      );
    });
}

export function startTranscriptionWorker(io) {
  function processUploads() {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error("Error reading uploads dir: ", err);
        return;
      }

      const sortedFiles = files
        .filter((file) => file.endsWith("webm"))
        .sort((a, b) => {
          const timestampA = parseInt(a.split("_")[1]);
          const timestampB = parseInt(b.split("_")[1]);
          return timestampA - timestampB;
        });
      sortedFiles.forEach((file) => {
        if (file === ".gitkeep") {
          return;
        }
        const filePath = path.join(uploadsDir, file);
        sendFileToWhisper(filePath, io);
      });
    });
  }

  const watcher = chokidar.watch(uploadsDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  watcher.on("add", (filePath) => {
    if (path.basename(filePath) === ".gitkeep") {
      console.log("Ignoring .gitkeep file.");
      return;
    }
    console.log(`File ${filePath} has been added`);
    sendFileToWhisper(filePath, io);
  });
  watcher.on("unlink", (filePath) => {
    console.log(`File ${filePath} has been removed`);
  });

  processUploads();
}
