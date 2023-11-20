const path = require("path");
const fs = require("fs");
const axios = require("axios");
const OpenAI = require("openai");
const FormData = require("form-data");
const chokidar = require("chokidar");
const { getIO } = require("../io");
const io = getIO();

const uploadsDir = path.join(__dirname, "../public/uploads");
const apiKey = process.env.OPENAI_API_KEY;

function sendFileToWhisper(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("model", "whisper-1");

  const config = {
    method: "POST",
    url: "https://api.openai.com/v1/audio/transcriptions",
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
      //   fs.unlinkSync(filePath);
    })
    .catch((err) => {
      console.error(
        "Falied to emit subtitle: ",
        "Error:",
        err.response ? err.response.data : err.message
      );
    });
}

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
      sendFileToWhisper(filePath);
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
  sendFileToWhisper(filePath);
});
//   .on("unlink", (filePath) => {
//     console.log(`File ${filePath} has been removed`);
//     // Handle file removal if necessary
//   });

processUploads();
