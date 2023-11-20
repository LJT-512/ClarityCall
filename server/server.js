const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
require("dotenv").config();
const upload = require("./middleware/multer.js");
const { init } = require("./io.js");
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = init(server);

require("./controller/transcribe.js");

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/upload", upload.single("audio"), (req, res) => {
  res.send({ message: "File uploaded successfully." });
});

let userConnections = [];

io.on("connection", (socket) => {
  console.log("socket id is", socket.id);
  socket.on("userconnect", (data) => {
    console.log("userconnect", data.displayName, data.meetingId);

    const otherUsers = userConnections.filter(
      (p) => p.meetingId === data.meetingId
    );
    console.log("otherUsers: ", otherUsers);

    userConnections.push({
      connectionId: socket.id,
      userId: data.displayName,
      meetingId: data.meetingId,
    });

    console.log("userConnections: ", userConnections);

    otherUsers.forEach((v) => {
      socket.to(v.connectionId).emit("informOthersAboutMe", {
        otherUserId: data.displayName,
        connId: socket.id,
      });
    });
    console.log("Informing new user about others", otherUsers);
    socket.emit("informMeAboutOtherUser", otherUsers);
  });
  socket.on("SDPProcess", (data) => {
    socket.to(data.toConnId).emit("SDPProcess", {
      message: data.message,
      fromConnId: socket.id,
    });
  });

  socket.on("disconnect", function () {
    console.log("Disconnected");
    const disUser = userConnections.find((p) => p.connectionId === socket.id);
    console.log("this is the disUser:", disUser);
    if (disUser) {
      const meetingId = disUser.meetingId;
      console.log("this is the disUser meetingId:", meetingId);
      userConnections = userConnections.filter(
        (p) => p.connectionId != socket.id
      );
      const list = userConnections.filter((p) => p.meetingId === meetingId);
      list.forEach((v) => {
        socket.to(v.connectionId).emit("informOtherAboutDisconnectedUser", {
          connId: socket.id,
        });
      });
    }
  });
});

module.exports = io;
